import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, Alert } from 'react-native';
import { AuthScreenProps } from '../../../types/navigation';
import { forgotStyles } from './styles';

const ForgotPassword: React.FC<AuthScreenProps> = ({ navigation }) => {
  const [email, setEmail] = useState('');

  const handleSendEmail = () => {
    if (!email) {
      Alert.alert('Error', 'Please enter your email');
      return;
    }
    // Simulate sending email
    Alert.alert('Email Sent', `A password reset link has been sent to ${email}`);
    navigation.navigate('ChooseRecovery');
  };

  return (
    <View style={forgotStyles.container}>
      <Text style={forgotStyles.title}>Forgot Password</Text>
      <Text style={forgotStyles.subtitle}>Enter the email associated with your account</Text>

      <TextInput
        style={forgotStyles.input}
        placeholder="Email"
        value={email}
        onChangeText={setEmail}
        keyboardType="email-address"
        autoCapitalize="none"
      />

      <TouchableOpacity style={forgotStyles.button} onPress={handleSendEmail}>
        <Text style={forgotStyles.buttonText}>Send Email</Text>
      </TouchableOpacity>

      <TouchableOpacity onPress={() => navigation.navigate('ChooseRecovery') }>
        <Text style={forgotStyles.linkText}>Skip: Use mobile verification</Text>
      </TouchableOpacity>
    </View>
  );
};

export default ForgotPassword;
