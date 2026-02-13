import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform } from 'react-native';

// Use emulator-friendly host: Android emulator -> 10.0.2.2, otherwise use machine IP
const USER_SERVICE_HOST = Platform.OS === 'android' ? 'http://10.0.2.2:8004' : 'http://10.190.154.90:8004';

type MoodData = {
  emotion: string; // Happy, Sad, Angry, Stress, Neutral
  emotion_score?: number; // 1-10, default 5
  chat_message_id?: string;
  notes?: string;
  lifestyle?: {
    sleep?: number;      // hours of sleep
    exercise?: number;   // minutes of exercise
    diet?: string;       // "good", "okay", "poor"
    water?: number;      // glasses of water
    [key: string]: any;  // allow other lifestyle fields
  };
};

export const saveMoodData = async (moodData: MoodData): Promise<boolean> => {
  try {
    const accessToken = await AsyncStorage.getItem('access_token');
    
    if (!accessToken) {
      console.error('No access token found');
      return false;
    }

    // Add timeout to prevent long waits
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 5000); // 5 second timeout

    const response = await fetch(`${USER_SERVICE_HOST}/users/mood`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        emotion: moodData.emotion,
        emotion_score: moodData.emotion_score || 5,
        chat_message_id: moodData.chat_message_id,
        notes: moodData.notes,
        lifestyle: moodData.lifestyle || {},
      }),
      signal: controller.signal,
    });
    
    clearTimeout(timeoutId);

    if (!response.ok) {
      console.error('Failed to save mood data:', await response.text());
      return false;
    }

    const data = await response.json();
    console.log('Mood data saved successfully:', data);
    return true;
  } catch (error) {
    console.error('Error saving mood data:', error);
    return false;
  }
};

export const getTodayMoods = async () => {
  try {
    const accessToken = await AsyncStorage.getItem('access_token');
    
    if (!accessToken) {
      console.error('No access token found');
      return [];
    }

    const response = await fetch('http://10.0.2.2:8004/users/mood/today', {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      console.error('Failed to fetch today moods');
      return [];
    }

    const data = await response.json();
    return data;
  } catch (error) {
    console.error('Error fetching today moods:', error);
    return [];
  }
};

export const getMoodAnalytics = async () => {
  try {
    const accessToken = await AsyncStorage.getItem('access_token');
    
    if (!accessToken) {
      console.error('No access token found');
      return [];
    }

    const response = await fetch('http://10.0.2.2:8004/users/mood/analytics/today', {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      console.error('Failed to fetch mood analytics');
      return [];
    }

    const data = await response.json();
    return data;
  } catch (error) {
    console.error('Error getting mood analytics:', error);
    return [];
  }
};

