import { create } from 'zustand';

interface UIState {
  theme: 'light' | 'dark';
  language: 'en' | 'hi';
  sidebarOpen: boolean;
  toggleTheme: () => void;
  setLanguage: (lang: 'en' | 'hi') => void;
  toggleSidebar: () => void;
}

export const useUIStore = create<UIState>((set) => ({
  theme: 'dark', // Dark mode by default
  language: 'en',
  sidebarOpen: false,

  toggleTheme: () => set((state) => {
    const nextTheme = state.theme === 'light' ? 'dark' : 'light';
    
    // Apply class to document element for Tailwind CSS compatibility
    const root = window.document.documentElement;
    root.classList.remove('light', 'dark');
    root.classList.add(nextTheme);
    
    return { theme: nextTheme };
  }),

  setLanguage: (lang) => set(() => {
    // i18next triggers will be wired in separately
    return { language: lang };
  }),

  toggleSidebar: () => set((state) => ({ sidebarOpen: !state.sidebarOpen })),
}));
export default useUIStore;
