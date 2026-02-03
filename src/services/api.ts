import AsyncStorage from '@react-native-async-storage/async-storage';
import { API_ENDPOINTS, API_CONFIG, fetchWithTimeout } from '../config/api';

/**
 * Authentication Service
 */
export const authService = {
  async login(email: string, password: string) {
    const response = await fetchWithTimeout(
      API_ENDPOINTS.LOGIN,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      },
      API_CONFIG.TIMEOUT.PROFILE
    );
    
    if (!response.ok) {
      throw new Error('Login failed');
    }
    
    return response.json();
  },

  async register(email: string, password: string, name: string) {
    const response = await fetchWithTimeout(
      API_ENDPOINTS.REGISTER,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password, name }),
      },
      API_CONFIG.TIMEOUT.PROFILE
    );
    
    if (!response.ok) {
      throw new Error('Registration failed');
    }
    
    return response.json();
  },

  async getAccessToken() {
    return await AsyncStorage.getItem('access_token');
  },
};

/**
 * User Profile Service with caching
 */
export const profileService = {
  async getProfile(userId: string, forceRefresh = false) {
    const cacheKey = `profile_${userId}`;
    const cacheTimeKey = `profile_time_${userId}`;
    
    if (!forceRefresh) {
      const cached = await AsyncStorage.getItem(cacheKey);
      const cacheTime = await AsyncStorage.getItem(cacheTimeKey);
      
      if (cached && cacheTime) {
        const age = Date.now() - parseInt(cacheTime, 10);
        if (age < API_CONFIG.CACHE.PROFILE) {
          return JSON.parse(cached);
        }
      }
    }
    
    const response = await fetchWithTimeout(
      API_ENDPOINTS.PROFILE(userId),
      {},
      API_CONFIG.TIMEOUT.PROFILE
    );
    
    if (!response.ok) {
      throw new Error('Failed to fetch profile');
    }
    
    const data = await response.json();
    
    // Cache the result
    await AsyncStorage.setItem(cacheKey, JSON.stringify(data));
    await AsyncStorage.setItem(cacheTimeKey, Date.now().toString());
    
    return data;
  },

  async updateProfile(userId: string, updates: any) {
    const token = await authService.getAccessToken();
    
    const response = await fetchWithTimeout(
      API_ENDPOINTS.PROFILE(userId),
      {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify(updates),
      },
      API_CONFIG.TIMEOUT.PROFILE
    );
    
    if (!response.ok) {
      throw new Error('Failed to update profile');
    }
    
    // Clear cache
    await AsyncStorage.removeItem(`profile_${userId}`);
    await AsyncStorage.removeItem(`profile_time_${userId}`);
    
    return response.json();
  },
};

/**
 * Chat Service
 */
export const chatService = {
  async sendMessage(message: string, mood: string = 'Neutral') {
    const response = await fetchWithTimeout(
      API_ENDPOINTS.CHAT,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message, mood }),
      },
      API_CONFIG.TIMEOUT.CHAT
    );
    
    if (!response.ok) {
      throw new Error('Failed to send message');
    }
    
    return response.json();
  },

  async resetChat() {
    const response = await fetchWithTimeout(
      API_ENDPOINTS.RESET_CHAT,
      { method: 'POST' },
      API_CONFIG.TIMEOUT.DEFAULT
    );
    
    return response.ok;
  },

  async analyzeEmotion(base64Image: string) {
    const response = await fetchWithTimeout(
      API_ENDPOINTS.ANALYZE_EMOTION,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ image: base64Image }),
      },
      API_CONFIG.TIMEOUT.CHAT
    );
    
    if (!response.ok) {
      throw new Error('Failed to analyze emotion');
    }
    
    return response.json();
  },
};

/**
 * Mood Service
 */
export const moodServiceAPI = {
  async saveMood(moodData: {
    emotion: string;
    emotion_score?: number;
    notes?: string;
    lifestyle?: any;
  }) {
    const token = await authService.getAccessToken();
    
    if (!token) {
      throw new Error('No access token');
    }
    
    const response = await fetchWithTimeout(
      API_ENDPOINTS.MOOD,
      {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          emotion: moodData.emotion,
          emotion_score: moodData.emotion_score || 5,
          notes: moodData.notes,
          lifestyle: moodData.lifestyle || {},
        }),
      },
      API_CONFIG.TIMEOUT.MOOD
    );
    
    if (!response.ok) {
      throw new Error('Failed to save mood');
    }
    
    return response.json();
  },
};
