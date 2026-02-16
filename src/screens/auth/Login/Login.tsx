import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  Alert,
  ScrollView,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { AuthScreenProps } from '../../../types/navigation';
import { loginStyles } from './styles';
import LoginBackground from './LoginBackground';
import { API_ENDPOINTS, fetchWithTimeout } from '../../../config/api';
import { profileService } from '../../../services/api';

const Login: React.FC<AuthScreenProps> = ({ navigation }) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  const handleLogin = async () => {
    if (!email || !password) {
      Alert.alert('Error', 'Please fill in all fields');
      return;
    }
    try {
      const response = await fetch('http://10.0.2.2:8004/api/auth/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          email,
          password,
        }),
      });
      const data = await response.json();
      console.log('Login response data:', data);
      if (response.ok) {
        try {
          // access_token is top-level, user object may be nested under `user` per backend
          const accessToken = data.access_token;
          const userObj = data.user || data;

          await AsyncStorage.setItem('access_token', accessToken || '');

          const uid = userObj?.id ? String(userObj.id) : (data.user_id ? String(data.user_id) : '');
          const userEmail = userObj?.email || data.email || '';

          if (uid) await AsyncStorage.setItem('user_id', uid);
          if (userEmail) await AsyncStorage.setItem('user_email', userEmail);

          // pick display name from user object (prefer full_name -> username -> email local-part)
          let displayName = userObj?.full_name || userObj?.username || '';
          if (!displayName && userEmail) displayName = userEmail.split('@')[0];

          // ensure cache and visible name are updated
          await AsyncStorage.setItem('user_name', displayName || '');
          await AsyncStorage.setItem('cached_user_name', displayName || '');
          await AsyncStorage.setItem('cache_time', Date.now().toString());

          // clear generic local-profile/photo so previous user's data does not leak
          await AsyncStorage.removeItem('local_profile');
          await AsyncStorage.removeItem('profile_photo');
        } catch (e) {
          console.warn('Failed to save user info', e);
        }

        Alert.alert('Success', 'Login successful');

        // Decide where to navigate: if server profile is empty (id === 0) send user to Profile screen
        try {
          const uid = await AsyncStorage.getItem('user_id');
          if (uid) {
            const serverProfile = await profileService.getProfile(uid);
            if (!serverProfile || serverProfile.id === 0) {
              // navigate to Main and tell MainTabs to open the Profile tab
              navigation.navigate('Main', { initialTab: 'Profile' as const } as any);
            } else {
              navigation.navigate('Main');
            }
          } else {
            navigation.navigate('Main');
          }
        } catch (err) {
          console.warn('Error checking server profile after login', err);
          navigation.navigate('Main');
        }
      } else {
        let errorMessage = data.detail || data.message || 'Login failed';
        if (errorMessage.toLowerCase().includes('email not confirmed') || errorMessage.toLowerCase().includes('confirm your email')) {
          errorMessage = 'Please confirm your email before logging in. Check your email for the confirmation link.';
        }
        Alert.alert('Error', errorMessage);
      }
    } catch (error) {
      console.error('Login error:', error);
      Alert.alert('Error', 'Network error');
    }
  };

  return (
    <>
      <LoginBackground />
      <ScrollView 
       
      >
        <View style={loginStyles.container}>
        <View style={loginStyles.authHeader}>
          <View style={loginStyles.authHeaderInner}>
            <Text style={loginStyles.authTitle}>Sign In</Text>
          </View>
        </View>

        <View style={loginStyles.authCard}>
          {/* Body */}
          <View style={loginStyles.authBody}>
            <View style={loginStyles.fieldGroup}>
              <Text style={loginStyles.fieldLabel}>E-mail</Text>
              <View style={loginStyles.inputWrapper}>
                <View style={loginStyles.iconContainer}>
                  <Text style={loginStyles.iconText}>📧</Text>
                </View>
                <TextInput
                  style={loginStyles.input}
                  placeholder="Hello@dream.com"
                  placeholderTextColor="#c4c4c4"
                  value={email}
                  onChangeText={setEmail}
                  keyboardType="email-address"
                  autoCapitalize="none"
                />
              </View>
            </View>

            <View style={loginStyles.fieldGroup}>
              <Text style={loginStyles.fieldLabel}>Password</Text>
              <View style={loginStyles.inputWrapper}>
                <View style={loginStyles.iconContainer}>
                  <Text style={loginStyles.iconText}>🔒</Text>
                </View>
                <TextInput
                  style={loginStyles.input}
                  placeholder="********"
                  placeholderTextColor="#c4c4c4"
                  value={password}
                  onChangeText={setPassword}
                  secureTextEntry
                />
              </View>
            </View>

            <TouchableOpacity onPress={() => navigation.navigate('ForgotPassword')}>
              <Text style={loginStyles.forgotLink}>Forgot password?</Text>
            </TouchableOpacity>

            <TouchableOpacity style={loginStyles.primaryBtn} onPress={handleLogin}>
              <Text style={loginStyles.primaryBtnText}>Sign In</Text>
            </TouchableOpacity>

            {/* OR separator + social buttons */}
            <View style={loginStyles.orRow}>
              <View style={loginStyles.line} />
              <Text style={loginStyles.orText}>OR</Text>
              <View style={loginStyles.line} />
            </View>

            <View style={loginStyles.socialRow}>
              <TouchableOpacity
                style={loginStyles.socialBtn}
                onPress={() => Alert.alert('Info', 'Facebook login is not configured yet')}
              >
                <Text style={loginStyles.socialIcon}>f</Text>
                <Text style={loginStyles.socialBtnText}>Facebook</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={loginStyles.socialBtn}
                onPress={() => Alert.alert('Info', 'Google login is not configured yet')}
              >
                <Text style={loginStyles.socialIcon}>G</Text>
                <Text style={loginStyles.socialBtnText}>Google</Text>
              </TouchableOpacity>
            </View>
          </View>

          {/* Footer */}
          <View style={loginStyles.authFooter}>
            <Text style={loginStyles.footerText}>
              Don't have an account?{' '}
              <Text 
                style={loginStyles.footerLink}
                onPress={() => navigation.navigate('Register')}
              >
                Sign Up
              </Text>
            </Text>
          </View>
        </View>

        {/* Admin link */}
        <TouchableOpacity 
          onPress={() => navigation.navigate('AdminLogin')}
          style={loginStyles.adminLinkContainer}
        >
          <Text style={loginStyles.adminLink}>Admin login</Text>
        </TouchableOpacity> 
      </View>
    </ScrollView>
    </>
  );
};

export default Login;