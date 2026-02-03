import AsyncStorage from '@react-native-async-storage/async-storage';

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

    const response = await fetch('http://10.0.2.2:8004/users/mood', {
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

/**
 * Get mood timeline for today (5-min buckets) for chart visualization
 * Returns array of {period_5_min, emotion, intensity, ts, lifestyle}
 */
export const getMoodTimelineToday = async () => {
  try {
    const accessToken = await AsyncStorage.getItem('access_token');
    
    if (!accessToken) {
      console.error('No access token found');
      return [];
    }

    // Call user-service endpoint (port 8004)
    const response = await fetch('http://10.0.2.2:8004/users/mood/timeline/today', {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      console.error('Failed to fetch mood timeline');
      return [];
    }

    const data = await response.json();
    return data;
  } catch (error) {
    console.error('Error getting mood timeline:', error);
    return [];
  }
};

/**
 * Get mood timeline for the past week
 */
export const getMoodTimelineWeek = async () => {
  try {
    const accessToken = await AsyncStorage.getItem('access_token');
    
    if (!accessToken) {
      console.error('No access token found');
      return [];
    }

    const response = await fetch('http://10.0.2.2:8003/api/v1/mood/timeline/week', {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      console.error('Failed to fetch weekly mood timeline');
      return [];
    }

    const data = await response.json();
    return data;
  } catch (error) {
    console.error('Error getting weekly mood timeline:', error);
    return [];
  }
};

/**
 * Get mood analytics for today (aggregated data)
 */
export const getMoodAnalyticsToday = async () => {
  try {
    const accessToken = await AsyncStorage.getItem('access_token');
    
    if (!accessToken) {
      console.error('No access token found');
      return null;
    }

    const response = await fetch('http://10.0.2.2:8003/api/v1/mood/analytics/today', {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      console.error('Failed to fetch mood analytics');
      return null;
    }

    const data = await response.json();
    return data;
  } catch (error) {
    console.error('Error getting mood analytics:', error);
    return null;
  }
};

/**
 * Get mood analytics for the past week (daily breakdown)
 */
export const getMoodAnalyticsWeek = async () => {
  try {
    const accessToken = await AsyncStorage.getItem('access_token');
    
    if (!accessToken) {
      console.error('No access token found');
      return [];
    }

    const response = await fetch('http://10.0.2.2:8003/api/v1/mood/analytics/week', {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      console.error('Failed to fetch weekly mood analytics');
      return [];
    }

    const data = await response.json();
    return data;
  } catch (error) {
    console.error('Error getting mood timeline:', error);
    return [];
  }
};

