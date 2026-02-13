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
          await AsyncStorage.setItem('access_token', data.access_token);
          await AsyncStorage.setItem('user_id', data.user_id);
          await AsyncStorage.setItem('user_email', data.email);
          if (data.name) {
            await AsyncStorage.setItem('user_name', data.name);
          }
        } catch (e) {
          console.warn('Failed to save user info', e);
        }
        Alert.alert('Success', 'Login successful');
        navigation.navigate('Main');
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
        
        {/* Animation Demo link */}
        <TouchableOpacity 
          onPress={() => navigation.navigate('RiveAnimationDemo')}
          style={loginStyles.demoLinkContainer}
        >
          <Text style={loginStyles.demoLink}>🎨 View Animations</Text>
        </TouchableOpacity>
      </View>
    </ScrollView>
    </>
  );
};

export default Login;