// API Configuration
export const API_CONFIG = {
  USER_SERVICE: 'http://10.0.2.2:8004',
  CHAT_SERVICE: 'http://10.0.2.2:8001',
  MOOD_SERVICE: 'http://10.0.2.2:8003',
  
  // Timeouts in milliseconds
  TIMEOUT: {
    DEFAULT: 10000, // 10 seconds
    CHAT: 15000,    // 15 seconds for chat (longer for AI)
    PROFILE: 5000,  // 5 seconds for profile
    MOOD: 5000,     // 5 seconds for mood
  },
  
  // Cache durations in milliseconds
  CACHE: {
    PROFILE: 300000, // 5 minutes
    SETTINGS: 600000, // 10 minutes
  },
};

// Helper function for fetch with timeout
export const fetchWithTimeout = async (
  url: string,
  options: RequestInit = {},
  timeout: number = API_CONFIG.TIMEOUT.DEFAULT
): Promise<Response> => {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeout);
  
  try {
    const response = await fetch(url, {
      ...options,
      signal: controller.signal,
      headers: {
        'Accept-Encoding': 'gzip',
        ...options.headers,
      },
    });
    clearTimeout(timeoutId);
    return response;
  } catch (error) {
    clearTimeout(timeoutId);
    throw error;
  }
};

// API Endpoints
export const API_ENDPOINTS = {
  // User Service
  REGISTER: `${API_CONFIG.USER_SERVICE}/users/register`,
  LOGIN: `${API_CONFIG.USER_SERVICE}/auth/login`,
  PROFILE: (uid: string) => `${API_CONFIG.USER_SERVICE}/users/profile/${uid}`,
  MOOD: `${API_CONFIG.USER_SERVICE}/users/mood`,
  
  // Chat Service
  CHAT: `${API_CONFIG.CHAT_SERVICE}/api/v1/chat`,
  RESET_CHAT: `${API_CONFIG.CHAT_SERVICE}/api/v1/reset-chat`,
  ANALYZE_EMOTION: `${API_CONFIG.CHAT_SERVICE}/api/v1/analyze-emotion`,
  
  // Admin
  ADMIN_USERS: `${API_CONFIG.USER_SERVICE}/admin/online-users`,
};
