import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  Alert,
  ScrollView,
} from 'react-native';
import { AuthScreenProps } from '../../../types/navigation';
import { registerStyles } from './registerStyles';
import RegisterSvg from './register.svg';



const Register: React.FC<AuthScreenProps> = ({ navigation }) => {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  const handleRegister = async () => {
    if (!name || !email || !password || !confirmPassword) {
      Alert.alert('Error', 'Please fill in all fields');
      return;
    }
    if (password !== confirmPassword) {
      Alert.alert('Error', 'Passwords do not match');
      return;
    }
    try {
      const response = await fetch('http://10.0.2.2:8004/api/auth/register', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          email,
          username: email.split('@')[0], // Generate username from email
          password,
          full_name: name,
        }),
      });
      const data = await response.json();
      if (response.ok) {
        Alert.alert('Success', 'Registration successful');
        navigation.navigate('Login');
      } else {
        Alert.alert('Error', data.detail || data.message || 'Registration failed');
      }
    } catch (error) {
      console.error('Registration error:', error);
      Alert.alert('Error', 'Network error');
    }
  };

  return (
    <View style={registerStyles.wrapper}>
      <View style={registerStyles.svgBackground}>
        <RegisterSvg 
          width="100%" 
          height="100%"
          preserveAspectRatio="xMidYMid meet"
        />
      </View>
      <ScrollView 
        contentContainerStyle={registerStyles.scrollContainer}
        keyboardShouldPersistTaps="handled"
      >
        <View style={registerStyles.container}>
        <View style={registerStyles.authCard}>
          <Text style={registerStyles.cardTitle}>Sign Up</Text>

          {/* Body */}
          <View style={registerStyles.authBody}>
          <View style={registerStyles.fieldGroup}>
            <Text style={registerStyles.fieldLabel}>Full Name</Text>
            <View style={registerStyles.inputWrapper}>
              <View style={registerStyles.iconContainer}>
                <Text style={registerStyles.iconText}>👤</Text>
              </View>
              <TextInput
                style={registerStyles.input}
                placeholder="Wasim Bari"
                placeholderTextColor="#c4c4c4"
                value={name}
                onChangeText={setName}
                autoCapitalize="words"
              />
            </View>
          </View>

          <View style={registerStyles.fieldGroup}>
            <Text style={registerStyles.fieldLabel}>E-mail</Text>
            <View style={registerStyles.inputWrapper}>
              <View style={registerStyles.iconContainer}>
                <Text style={registerStyles.iconText}>📧</Text>
              </View>
              <TextInput
                style={registerStyles.input}
                placeholder="Hello@dream.com"
                placeholderTextColor="#c4c4c4"
                value={email}
                onChangeText={setEmail}
                keyboardType="email-address"
                autoCapitalize="none"
              />
            </View>
          </View>

          <View style={registerStyles.fieldGroup}>
            <Text style={registerStyles.fieldLabel}>Password</Text>
            <View style={registerStyles.inputWrapper}>
              <View style={registerStyles.iconContainer}>
                <Text style={registerStyles.iconText}>🔒</Text>
              </View>
              <TextInput
                style={registerStyles.input}
                placeholder="********"
                placeholderTextColor="#c4c4c4"
                value={password}
                onChangeText={setPassword}
                secureTextEntry
              />
            </View>
          </View>

          <View style={registerStyles.fieldGroup}>
            <Text style={registerStyles.fieldLabel}>Confirm Password</Text>
            <View style={registerStyles.inputWrapper}>
              <View style={registerStyles.iconContainer}>
                <Text style={registerStyles.iconText}>🔒</Text>
              </View>
              <TextInput
                style={registerStyles.input}
                placeholder="********"
                placeholderTextColor="#c4c4c4"
                value={confirmPassword}
                onChangeText={setConfirmPassword}
                secureTextEntry
              />
            </View>
          </View>

          <TouchableOpacity style={registerStyles.primaryBtn} onPress={handleRegister}>
            <Text style={registerStyles.primaryBtnText}>Sign Up</Text>
          </TouchableOpacity>
        </View>

        {/* Footer */}
        <View style={registerStyles.authFooter}>
          <Text style={registerStyles.footerText}>
            Already have an account?{' '}
            <Text 
              style={registerStyles.footerLink}
              onPress={() => navigation.navigate('Login')}
            >
              Sign In
            </Text>
          </Text>
        </View>
        </View>
        </View>
      </ScrollView>
    </View>
  );
};

export default Register;