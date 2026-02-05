import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, Alert } from 'react-native';
import { AuthScreenProps } from '../../../types/navigation';
import { StyleSheet } from 'react-native';

const otpStyles = StyleSheet.create({
  container: { flex: 1, padding: 20, justifyContent: 'center' },
  title: { fontSize: 22, fontWeight: '700', marginBottom: 8 },
  subtitle: { fontSize: 14, color: '#666', marginBottom: 20 },
  input: { borderWidth: 1, borderColor: '#ddd', borderRadius: 8, padding: 12, marginBottom: 16 },
  button: { backgroundColor: '#007AFF', padding: 14, borderRadius: 8, alignItems: 'center', marginBottom: 8 },
  buttonText: { color: '#fff', fontWeight: '600' },
  linkText: { color: '#007AFF', textAlign: 'center', marginTop: 8 },
});

interface OTPParams {
  phone?: string;
  code?: string; // for simulation only
}

const OTPEntry = ({ navigation, route }: any) => {
  const { phone, code } = (route?.params || {}) as OTPParams;
  const [otp, setOtp] = useState('');

  const handleVerify = () => {
    // Validation removed: accept any input and treat as successful login
    Alert.alert('Success', 'Login successful');
    navigation.navigate('Main');
  };

  return (
    <View style={otpStyles.container}>
      <Text style={otpStyles.title}>Enter verification code</Text>
      <Text style={otpStyles.subtitle}>We sent a code to {phone || 'your number'}</Text>

      <TextInput
        style={otpStyles.input}
        placeholder="Enter code"
        value={otp}
        onChangeText={setOtp}
        keyboardType="number-pad"
      />

      <TouchableOpacity style={otpStyles.button} onPress={handleVerify}>
        <Text style={otpStyles.buttonText}>Verify</Text>
      </TouchableOpacity>

      <TouchableOpacity onPress={() => navigation.navigate('MobileVerification') }>
        <Text style={otpStyles.linkText}>Resend / Change number</Text>
      </TouchableOpacity>
    </View>
  );
};

export default OTPEntry;
