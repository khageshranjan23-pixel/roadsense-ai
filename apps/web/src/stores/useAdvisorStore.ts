import { create } from 'zustand';
import { api } from '../services/api';
import { supabase } from '../lib/supabase';
import { ChatMessage, SceneContext } from '@roadsense-ai/shared-types';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000/api/v1';

interface AdvisorState {
  messages: ChatMessage[];
  sceneContext: SceneContext | null;
  uploadedFile: File | null;
  isAnalyzing: boolean;
  isChatting: boolean;
  riskAssessment: 'SAFE' | 'CAUTION' | 'UNSAFE' | null;
  detectedObjects: string[];
  uploadMedia: (file: File) => Promise<void>;
  sendMessage: (question: string, language: 'en' | 'hi') => Promise<void>;
  clearSession: () => void;
}

export const useAdvisorStore = create<AdvisorState>((set, get) => ({
  messages: [],
  sceneContext: null,
  uploadedFile: null,
  isAnalyzing: false,
  isChatting: false,
  riskAssessment: null,
  detectedObjects: [],

  uploadMedia: async (file) => {
    set({ isAnalyzing: true, uploadedFile: file, sceneContext: null, riskAssessment: null, detectedObjects: [] });
    try {
      const formData = new FormData();
      formData.append('file', file);
      
      const res = await api.post('/advisor/analyze', formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });
      
      const ctx = res.data as SceneContext;
      
      // Calculate risk rating
      let rating: 'SAFE' | 'CAUTION' | 'UNSAFE' = 'SAFE';
      const ped = ctx.pedestrians_on_crossing || 0;
      const tl = ctx.traffic_light_color || 'none';
      const dist = ctx.closest_vehicle_distance || 999.0;
      
      if (tl === 'red' || dist < 150.0) {
        rating = 'UNSAFE';
      } else if (tl === 'yellow' || ped > 0 || dist < 250.0) {
        rating = 'CAUTION';
      }

      const objects = Array.from(new Set(ctx.objects.map(o => o.class_name)));

      set({
        sceneContext: ctx,
        detectedObjects: objects,
        riskAssessment: rating,
        isAnalyzing: false
      });
      
      // Pre-add a helper prompt from AI
      set((state) => ({
        messages: [
          ...state.messages,
          {
            role: 'model',
            content: `VERDICT: ${rating}\nREASON: Scene upload analysis complete. Found: ${objects.join(', ') || 'clear road'}.\nADVICE: What would you like to know about safety in this scene?`
          }
        ]
      }));
    } catch (err) {
      set({ isAnalyzing: false, uploadedFile: null });
      throw err;
    }
  },

  sendMessage: async (question, language) => {
    const { messages, sceneContext } = get();
    
    // Add user message
    const userMsg: ChatMessage = { role: 'user', content: question };
    const initialMessages = [...messages, userMsg];
    
    // Add empty model message for streaming destination
    const modelMsg: ChatMessage = { role: 'model', content: '' };
    set({
      messages: [...initialMessages, modelMsg],
      isChatting: true
    });

    try {
      const { data: { session } } = await supabase.auth.getSession();
      const token = session?.access_token || '';

      const response = await fetch(`${API_URL}/advisor/chat`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          question: language === 'hi' ? `${question} (respond in Hindi)` : question,
          scene_context: sceneContext,
          conversation_history: messages.slice(-6) // Send recent history turns
        })
      });

      if (!response.ok) {
        throw new Error('Failed to fetch advisor response.');
      }

      const reader = response.body?.getReader();
      const decoder = new TextDecoder();
      
      if (!reader) {
        throw new Error('Response stream is unavailable.');
      }

      let accumulatedContent = '';
      
      while (true) {
        const { value, done } = await reader.read();
        if (done) break;
        
        const chunk = decoder.decode(value, { stream: true });
        accumulatedContent += chunk;
        
        // Update the last message in real-time
        set((state) => {
          const updated = [...state.messages];
          if (updated.length > 0) {
            updated[updated.length - 1] = {
              role: 'model',
              content: accumulatedContent
            };
          }
          return { messages: updated };
        });
      }
      
      set({ isChatting: false });
    } catch (err: any) {
      set({ isChatting: false });
      // Show error in chat
      set((state) => {
        const updated = [...state.messages];
        if (updated.length > 0) {
          updated[updated.length - 1] = {
            role: 'model',
            content: `VERDICT: CAUTION\nREASON: Network connection failed.\nADVICE: ${err.message || 'Please retry your message.'}`
          };
        }
        return { messages: updated };
      });
    }
  },

  clearSession: () => {
    set({
      messages: [],
      sceneContext: null,
      uploadedFile: null,
      isAnalyzing: false,
      isChatting: false,
      riskAssessment: null,
      detectedObjects: []
    });
  }
}));
