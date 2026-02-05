import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  Alert,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { AuthScreenProps } from '../../../types/navigation';
import { loginStyles } from './styles';

const Login: React.FC<AuthScreenProps> = ({ navigation }) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  const handleLogin = async () => {
    if (!email || !password) {
      Alert.alert('Error', 'Please fill in all fields');
      return;
    }
    try {
      const response = await fetch('http://10.0.2.2:8004/auth/login', {
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
      console.log('Login response data:', data); // Debug log
      if (response.ok) {
        // Store token and user info (use parsed `data` only once)
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
    <View style={loginStyles.container}>
      <Text style={loginStyles.title}>Welcome Back</Text>
      <Text style={loginStyles.subtitle}>Sign in to your account</Text>

      <TextInput
        style={loginStyles.input}
        placeholder="Email"
        value={email}
        onChangeText={setEmail}
        keyboardType="email-address"
        autoCapitalize="none"
      />

      <TextInput
        style={loginStyles.input}
        placeholder="Password"
        value={password}
        onChangeText={setPassword}
        secureTextEntry
      />

      <TouchableOpacity style={loginStyles.button} onPress={handleLogin}>
        <Text style={loginStyles.buttonText}>Login</Text>
      </TouchableOpacity>

      <TouchableOpacity onPress={() => navigation.navigate('ForgotPassword')}>
        <Text style={[loginStyles.linkText, { marginTop: 8 }]}>Forgot password?</Text>
      </TouchableOpacity>

      <TouchableOpacity onPress={() => navigation.navigate('Register')}>
        <Text style={loginStyles.linkText}>Don't have an account? Register</Text>
      </TouchableOpacity>

      <TouchableOpacity onPress={() => navigation.navigate('AdminLogin') }>
        <Text style={[loginStyles.linkText, { marginTop: 12 }]}>Admin login</Text>
      </TouchableOpacity>
    </View>
  );
};

export default Login;