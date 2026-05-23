import { create } from 'zustand';
import { supabase } from '../lib/supabase';
import { Profile } from '@roadsense-ai/shared-types';

interface AuthState {
  user: any | null;
  session: any | null;
  profile: Profile | null;
  isLoading: boolean;
  error: string | null;
  login: (email: string, password: string) => Promise<void>;
  signup: (
    email: string,
    password: string,
    fullName: string,
    role: 'student' | 'teacher' | 'admin',
    ageGroup?: '6-8' | '9-11' | '12-14' | '15-17',
    schoolJoinCode?: string
  ) => Promise<void>;
  logout: () => Promise<void>;
  updateProfile: (updates: Partial<Profile>) => Promise<void>;
  initialize: () => Promise<void>;
}

export const useAuthStore = create<AuthState>((set, get) => ({
  user: null,
  session: null,
  profile: null,
  isLoading: true,
  error: null,

  initialize: async () => {
    set({ isLoading: true, error: null });
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (session) {
        const { data: profile } = await supabase
          .from('profiles')
          .select('*, schools(name)')
          .eq('id', session.user.id)
          .single();

        set({ user: session.user, session, profile, isLoading: false });
      } else {
        set({ user: null, session: null, profile: null, isLoading: false });
      }
    } catch (err: any) {
      set({ error: err.message, isLoading: false });
    }

    // Set up auth state change listener
    supabase.auth.onAuthStateChange(async (_event, session) => {
      if (session) {
        const { data: profile } = await supabase
          .from('profiles')
          .select('*, schools(name)')
          .eq('id', session.user.id)
          .single();

        set({ user: session.user, session, profile, isLoading: false });
      } else {
        set({ user: null, session: null, profile: null, isLoading: false });
      }
    });
  },

  login: async (email, password) => {
    set({ isLoading: true, error: null });
    try {
      const { data, error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) throw error;

      const { data: profile, error: profError } = await supabase
        .from('profiles')
        .select('*, schools(name)')
        .eq('id', data.user.id)
        .single();
      if (profError) throw profError;

      set({ user: data.user, session: data.session, profile, isLoading: false });
    } catch (err: any) {
      set({ error: err.message, isLoading: false });
      throw err;
    }
  },

  signup: async (email, password, fullName, role, ageGroup, schoolJoinCode) => {
    set({ isLoading: true, error: null });
    try {
      // 1. Sign up auth user
      const { data, error } = await supabase.auth.signUp({ email, password });
      if (error) throw error;
      if (!data.user) throw new Error('Signup failed. User not created.');

      // 2. Resolve school ID if join code is provided
      let schoolId = null;
      if (schoolJoinCode && role === 'student') {
        const { data: school, error: schoolError } = await supabase
          .from('schools')
          .select('id')
          .eq('join_code', schoolJoinCode)
          .single();
        if (schoolError) throw new Error('Invalid school join code.');
        schoolId = school.id;
      }

      // 3. Create profile
      const profileData: any = {
        id: data.user.id,
        full_name: fullName,
        role,
        preferred_language: 'en',
      };

      if (role === 'student' && ageGroup) {
        profileData.age_group = ageGroup;
        profileData.school_id = schoolId;
      }

      const { error: profileError } = await supabase
        .from('profiles')
        .insert(profileData);
      
      if (profileError) throw profileError;

      // Fetch newly created profile
      const { data: profile } = await supabase
        .from('profiles')
        .select('*, schools(name)')
        .eq('id', data.user.id)
        .single();

      set({ user: data.user, session: data.session, profile, isLoading: false });
    } catch (err: any) {
      set({ error: err.message, isLoading: false });
      throw err;
    }
  },

  logout: async () => {
    set({ isLoading: true, error: null });
    try {
      const { error } = await supabase.auth.signOut();
      if (error) throw error;
      set({ user: null, session: null, profile: null, isLoading: false });
    } catch (err: any) {
      set({ error: err.message, isLoading: false });
      throw err;
    }
  },

  updateProfile: async (updates) => {
    const { profile } = get();
    if (!profile) return;

    set({ isLoading: true, error: null });
    try {
      const { error } = await supabase
        .from('profiles')
        .update(updates)
        .eq('id', profile.id);
      
      if (error) throw error;

      // Re-fetch profile
      const { data: updatedProfile } = await supabase
        .from('profiles')
        .select('*, schools(name)')
        .eq('id', profile.id)
        .single();

      set({ profile: updatedProfile, isLoading: false });
    } catch (err: any) {
      set({ error: err.message, isLoading: false });
      throw err;
    }
  },
}));
