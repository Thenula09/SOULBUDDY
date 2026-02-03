import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, Alert, StyleSheet } from 'react-native';
import { AuthScreenProps } from '../../../types/navigation';
import AsyncStorage from '@react-native-async-storage/async-storage';

const ADMIN_EMAIL = 'admin12@gmil.com';
const ADMIN_PASSWORD = '123456';

const AdminLogin: React.FC<AuthScreenProps> = ({ navigation }) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  const handleLogin = async () => {
    if (!email || !password) {
      Alert.alert('Error', 'Please fill in all fields');
      return;
    }

    // Simple local admin credential check
    if (email === ADMIN_EMAIL && password === ADMIN_PASSWORD) {
      try {
        await AsyncStorage.setItem('is_admin', 'true');
      } catch (e) {
        console.warn('Failed to save admin flag', e);
      }
      Alert.alert('Success', 'Admin login successful');
      navigation.navigate('AdminHome');
    } else {
      Alert.alert('Error', 'Invalid admin credentials');
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Admin Login</Text>
      <Text style={styles.subtitle}>Enter admin credentials to continue</Text>

      <TextInput
        style={styles.input}
        placeholder="Email"
        value={email}
        onChangeText={setEmail}
        keyboardType="email-address"
        autoCapitalize="none"
      />

      <TextInput
        style={styles.input}
        placeholder="Password"
        value={password}
        onChangeText={setPassword}
        secureTextEntry
      />

      <TouchableOpacity style={styles.button} onPress={handleLogin}>
        <Text style={styles.buttonText}>Login as Admin</Text>
      </TouchableOpacity>

      <TouchableOpacity onPress={() => navigation.navigate('Login') }>
        <Text style={styles.linkText}>Back to user login</Text>
      </TouchableOpacity>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, justifyContent: 'center', padding: 20, backgroundColor: '#fff' },
  title: { fontSize: 28, fontWeight: 'bold', textAlign: 'center', marginBottom: 8 },
  subtitle: { fontSize: 14, textAlign: 'center', color: '#666', marginBottom: 20 },
  input: { borderWidth: 1, borderColor: '#eee', borderRadius: 8, padding: 12, marginBottom: 12 },
  button: { backgroundColor: '#333', paddingVertical: 12, borderRadius: 10, alignItems: 'center', marginTop: 8 },
  buttonText: { color: '#fff', fontWeight: '600' },
  linkText: { color: '#007AFF', textAlign: 'center', marginTop: 12 },
});

export default AdminLogin;