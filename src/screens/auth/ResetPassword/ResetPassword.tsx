import React, { useEffect, useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, Alert, Linking } from 'react-native';
import { AuthScreenProps } from '../../../types/navigation';
import { resetStyles } from './styles';
import { supabase } from '../../../services/supabase';

const ResetPassword: React.FC<AuthScreenProps & any> = ({ navigation, route }) => {
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [accessToken, setAccessToken] = useState<string | null>(null);

  useEffect(() => {
    // prefer token passed via navigation params
    const tokenFromParams = route?.params?.accessToken;
    if (tokenFromParams) {
      setAccessToken(tokenFromParams);
      return;
    }

    // otherwise try to parse initial URL (deep link)
    (async () => {
      const url = await Linking.getInitialURL();
      if (!url) return;
      try {
        // URLSearchParams typings may not be present in RN TS setup; parse manually
        const match = url.match('[?&](access_token|accessToken)=([^&]+)');
        const t = match ? decodeURIComponent(match[2]) : null;
        if (t) setAccessToken(t);
      } catch {
        // ignore
      }
    })();
  }, [route]);

  const handleUpdatePassword = async () => {
    if (!newPassword || newPassword.length < 6) {
      Alert.alert('Error', 'Password must be at least 6 characters');
      return;
    }
    if (newPassword !== confirmPassword) {
      Alert.alert('Error', 'Passwords do not match');
      return;
    }

    try {
      // If we have a recovery access token from the link, set session first
      if (accessToken) {
        await supabase.auth.setSession({ access_token: accessToken, refresh_token: '' } as any);
      }

      const { error } = await supabase.auth.updateUser({ password: newPassword });
      if (error) {
        Alert.alert('Error', error.message);
        return;
      }

      Alert.alert('Success', 'Password updated successfully. Please sign in.');
      navigation.navigate('Login');
    } catch (err: any) {
      console.error('Update password error', err);
      Alert.alert('Error', 'Failed to update password');
    }
  };

  return (
    <View style={resetStyles.container}>
      <Text style={resetStyles.title}>Reset password</Text>
      <Text style={resetStyles.subtitle}>Enter a new password for your account.</Text>

      <TextInput
        style={resetStyles.input}
        secureTextEntry
        placeholder="New password"
        placeholderTextColor="#999"
        value={newPassword}
        onChangeText={setNewPassword}
      />

      <TextInput
        style={resetStyles.input}
        secureTextEntry
        placeholder="Confirm password"
        placeholderTextColor="#999"
        value={confirmPassword}
        onChangeText={setConfirmPassword}
      />

      <TouchableOpacity style={resetStyles.button} onPress={handleUpdatePassword}>
        <Text style={resetStyles.buttonText}>Update password</Text>
      </TouchableOpacity>

      <TouchableOpacity onPress={() => navigation.navigate('Login')}>
        <Text style={resetStyles.linkText}>Back to sign in</Text>
      </TouchableOpacity>
    </View>
  );
};

export default ResetPassword;
