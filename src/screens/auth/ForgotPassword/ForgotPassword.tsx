import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, Alert, ScrollView } from 'react-native';
import { AuthScreenProps } from '../../../types/navigation';
import { forgotStyles } from './styles';
import ForgotPasswordSvg from './forgotpaword.svg';
import { supabase } from '../../../services/supabase';



const ForgotPassword: React.FC<AuthScreenProps> = ({ navigation }) => {
  const [email, setEmail] = useState('');

  const handleSendEmail = async () => {
    if (!email) {
      Alert.alert('Error', 'Please enter your email');
      return;
    }

    try {
      // send reset email via Supabase
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: 'soulbuddy://reset-password', // deep link that opens the app
      });

      if (error) {
        Alert.alert('Error', error.message);
        return;
      }

      Alert.alert('Email sent', `A password reset link was sent to ${email}. Please check your inbox.`);
      navigation.navigate('ChooseRecovery');
    } catch (err) {
      console.error('Reset email error', err);
      Alert.alert('Error', 'Failed to send reset email.');
    }
  };

  return (
    <View style={forgotStyles.wrapper}>
      <View style={forgotStyles.svgBackground}>
        <ForgotPasswordSvg 
          width="100%" 
          height="100%"
          preserveAspectRatio="xMidYMid meet"
        />
      </View>
      <ScrollView 
        contentContainerStyle={forgotStyles.scrollContainer}
        keyboardShouldPersistTaps="handled"
      >
        <View style={forgotStyles.container}>
          <View style={forgotStyles.authCard}>
            <Text style={forgotStyles.cardTitle}>Forgot Password</Text>
            <Text style={forgotStyles.description}>
              Enter the email address associated with your account and we'll send you a link to reset your password.
            </Text>

            {/* Body */}
            <View style={forgotStyles.authBody}>
              <View style={forgotStyles.fieldGroup}>
                <Text style={forgotStyles.fieldLabel}>E-mail</Text>
                <View style={forgotStyles.inputWrapper}>
                  <View style={forgotStyles.iconContainer}>
                    <Text style={forgotStyles.iconText}>📧</Text>
                  </View>
                  <TextInput
                    style={forgotStyles.input}
                    placeholder="Hello@dream.com"
                    placeholderTextColor="#c4c4c4"
                    value={email}
                    onChangeText={setEmail}
                    keyboardType="email-address"
                    autoCapitalize="none"
                  />
                </View>
              </View>

              <TouchableOpacity style={forgotStyles.primaryBtn} onPress={handleSendEmail}>
                <Text style={forgotStyles.primaryBtnText}>Send Reset Link</Text>
              </TouchableOpacity>

              <TouchableOpacity onPress={() => navigation.navigate('ChooseRecovery')}>
                <Text style={forgotStyles.linkText}>Use mobile verification  instead</Text>
              </TouchableOpacity>
            </View>

            {/* Footer */}
            <View style={forgotStyles.authFooter}>
              <Text style={forgotStyles.footerText}>
                Remember your password?{' '}
                <Text 
                  style={forgotStyles.footerLink}
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

export default ForgotPassword;
