import { create } from 'zustand';

interface User {
  id: string;
  username: string;
  email: string;
  profile?: {
    full_name?: string;
    age?: number;
    gender?: string;
    profile_picture?: string;
    height?: number;
    weight?: number;
    lifestyle?: {
      exercise?: string;
      sleep?: string;
      diet?: string;
    };
  };
}

interface MoodEntry {
  id: string;
  mood: string;
  intensity: number;
  timestamp: string;
  lifestyle?: {
    exercise?: string;
    sleep?: string;
    diet?: string;
  };
}

interface StoreState {
  // Auth State
  authToken: string | null;
  isAuthenticated: boolean;
  setAuthToken: (token: string | null) => void;
  
  // User State
  user: User | null;
  setUser: (user: User | null) => void;
  
  // Profile State
  profileCache: { data: any; timestamp: number } | null;
  setProfileCache: (data: any) => void;
  clearProfileCache: () => void;
  
  // Mood State
  moods: MoodEntry[];
  setMoods: (moods: MoodEntry[]) => void;
  addMood: (mood: MoodEntry) => void;
  
  // Analytics State
  moodStats: {
    distribution: any[];
    weeklyTrend: any[];
    lastUpdated: number | null;
  };
  setMoodStats: (stats: { distribution: any[]; weeklyTrend: any[] }) => void;
  
  // Chat State
  messages: any[];
  setMessages: (messages: any[]) => void;
  addMessage: (message: any) => void;
  clearMessages: () => void;
  
  // Loading State
  isLoading: boolean;
  setIsLoading: (loading: boolean) => void;
  
  // Global Actions
  logout: () => void;
  reset: () => void;
}

const useStore = create<StoreState>((set) => ({
  // Auth State
  authToken: null,
  isAuthenticated: false,
  setAuthToken: (token) => 
    set({ authToken: token, isAuthenticated: !!token }),
  
  // User State
  user: null,
  setUser: (user) => set({ user }),
  
  // Profile State
  profileCache: null,
  setProfileCache: (data) => 
    set({ profileCache: { data, timestamp: Date.now() } }),
  clearProfileCache: () => 
    set({ profileCache: null }),
  
  // Mood State
  moods: [],
  setMoods: (moods) => set({ moods }),
  addMood: (mood) => 
    set((state) => ({ moods: [...state.moods, mood] })),
  
  // Analytics State
  moodStats: {
    distribution: [],
    weeklyTrend: [],
    lastUpdated: null,
  },
  setMoodStats: (stats) => 
    set({ 
      moodStats: {
        ...stats,
        lastUpdated: Date.now(),
      }
    }),
  
  // Chat State
  messages: [],
  setMessages: (messages) => set({ messages }),
  addMessage: (message) => 
    set((state) => ({ messages: [...state.messages, message] })),
  clearMessages: () => set({ messages: [] }),
  
  // Loading State
  isLoading: false,
  setIsLoading: (loading) => set({ isLoading: loading }),
  
  // Global Actions
  logout: () => 
    set({
      authToken: null,
      isAuthenticated: false,
      user: null,
      profileCache: null,
      moods: [],
      moodStats: {
        distribution: [],
        weeklyTrend: [],
        lastUpdated: null,
      },
      messages: [],
    }),
  
  reset: () => 
    set({
      authToken: null,
      isAuthenticated: false,
      user: null,
      profileCache: null,
      moods: [],
      moodStats: {
        distribution: [],
        weeklyTrend: [],
        lastUpdated: null,
      },
      messages: [],
      isLoading: false,
    }),
}));

export default useStore;
