/**
 * Authentication Service - User registration and login
 */
import AsyncStorage from '@react-native-async-storage/async-storage';
import { API_ENDPOINTS, fetchWithTimeout, API_CONFIG } from '../config/api';

export interface RegisterData {
  email: string;
  username: string;
  password: string;
  full_name?: string;
}

export interface LoginData {
  email: string;
  password: string;
}

export interface UserResponse {
  id: number;
  email: string;
  username: string;
  full_name?: string;
  is_active: boolean;
  created_at: string;
}

export interface AuthResponse {
  access_token: string;
  token_type: string;
  user: UserResponse;
}

const TOKEN_KEY = '@soulbuddy_auth_token';
const USER_KEY = '@soulbuddy_user';

export class AuthService {
  /**
   * Register a new user
   */
  static async register(data: RegisterData): Promise<AuthResponse> {
    try {
      const response = await fetchWithTimeout(
        API_ENDPOINTS.REGISTER,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(data),
        },
        API_CONFIG.TIMEOUT.DEFAULT
      );

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.detail || 'Registration failed');
      }

      const authData: AuthResponse = await response.json();
      
      // Save token and user data
      await this.saveAuthData(authData);
      
      return authData;
    } catch (error) {
      console.error('Registration error:', error);
      throw error;
    }
  }

  /**
   * Login user
   */
  static async login(data: LoginData): Promise<AuthResponse> {
    try {
      const response = await fetchWithTimeout(
        API_ENDPOINTS.LOGIN,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(data),
        },
        API_CONFIG.TIMEOUT.DEFAULT
      );

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.detail || 'Login failed');
      }

      const authData: AuthResponse = await response.json();
      
      // Save token and user data
      await this.saveAuthData(authData);
      
      return authData;
    } catch (error) {
      console.error('Login error:', error);
      throw error;
    }
  }

  /**
   * Get current user info from API
   */
  static async getCurrentUser(): Promise<UserResponse> {
    try {
      const token = await this.getToken();
      if (!token) {
        throw new Error('No authentication token found');
      }

      const response = await fetchWithTimeout(
        API_ENDPOINTS.CURRENT_USER,
        {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`,
          },
        },
        API_CONFIG.TIMEOUT.DEFAULT
      );

      if (!response.ok) {
        throw new Error('Failed to get current user');
      }

      const user: UserResponse = await response.json();
      
      // Update stored user data
      await AsyncStorage.setItem(USER_KEY, JSON.stringify(user));
      
      return user;
    } catch (error) {
      console.error('Get current user error:', error);
      throw error;
    }
  }

  /**
   * Logout user
   */
  static async logout(): Promise<void> {
    try {
      await AsyncStorage.multiRemove([TOKEN_KEY, USER_KEY]);
    } catch (error) {
      console.error('Logout error:', error);
      throw error;
    }
  }

  /**
   * Check if user is authenticated
   */
  static async isAuthenticated(): Promise<boolean> {
    try {
      const token = await this.getToken();
      return !!token;
    } catch (error) {
      return false;
    }
  }

  /**
   * Get stored token
   */
  static async getToken(): Promise<string | null> {
    try {
      return await AsyncStorage.getItem(TOKEN_KEY);
    } catch (error) {
      console.error('Get token error:', error);
      return null;
    }
  }

  /**
   * Get stored user data
   */
  static async getStoredUser(): Promise<UserResponse | null> {
    try {
      const userData = await AsyncStorage.getItem(USER_KEY);
      return userData ? JSON.parse(userData) : null;
    } catch (error) {
      console.error('Get stored user error:', error);
      return null;
    }
  }

  /**
   * Save authentication data
   */
  private static async saveAuthData(authData: AuthResponse): Promise<void> {
    try {
      await AsyncStorage.setItem(TOKEN_KEY, authData.access_token);
      await AsyncStorage.setItem(USER_KEY, JSON.stringify(authData.user));
    } catch (error) {
      console.error('Save auth data error:', error);
      throw error;
    }
  }

  /**
   * Make authenticated API request
   */
  static async authenticatedFetch(
    url: string,
    options: RequestInit = {},
    timeout?: number
  ): Promise<Response> {
    const token = await this.getToken();
    if (!token) {
      throw new Error('No authentication token found');
    }

    return fetchWithTimeout(
      url,
      {
        ...options,
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
          ...options.headers,
        },
      },
      timeout
    );
  }
}
