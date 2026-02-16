import React, { useEffect, useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, Alert, Linking } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
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
      console.log('[ResetPassword] token received from navigation params:', tokenFromParams ? 'yes' : 'no');
      setAccessToken(tokenFromParams);
      return;
    }

    // otherwise try to parse initial URL (deep link)
    (async () => {
      const url = await Linking.getInitialURL();
      console.log('[ResetPassword] initial URL for deep link:', url);
      if (!url) return;
      try {
        // parse both query params and fragment/hash using regex (works in RN TS)
        const qp = url.match('[?&](?:access_token|accessToken)=([^&]+)');
        if (qp) {
          console.log('[ResetPassword] token parsed from query string');
          setAccessToken(decodeURIComponent(qp[1]));
          return;
        }
        const hashMatch = url.match('#(?:.*?)(?:access_token|accessToken)=([^&]+)');
        if (hashMatch) {
          console.log('[ResetPassword] token parsed from URL hash');
          setAccessToken(decodeURIComponent(hashMatch[1]));
          return;
        }
      } catch (e) {
        console.warn('[ResetPassword] error parsing initial URL', e);
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
      console.log('[ResetPassword] handleUpdatePassword - will update password; accessToken present:', !!accessToken);
      // If we have a recovery access token from the link, set session first
      if (accessToken) {
        console.log('[ResetPassword] setting session with recovery token');
        await supabase.auth.setSession({ access_token: accessToken, refresh_token: '' } as any);
      }

      const { error } = await supabase.auth.updateUser({ password: newPassword });
      if (error) {
        console.error('[ResetPassword] updateUser error', error);
        Alert.alert('Error', error.message);
        return;
      }

      console.log('[ResetPassword] password updated successfully');
      // --- AUTO SIGN-IN: persist session/user & navigate to Main ---
      try {
        // try to get session (access token)
        const sessionResp: any = await supabase.auth.getSession();
        console.log('[ResetPassword] session after update:', sessionResp);
        const session = sessionResp?.data?.session;
        const accessTokenFromSession = session?.access_token || accessToken;

        // get the authenticated user
        const userResp: any = await supabase.auth.getUser();
        console.log('[ResetPassword] user after update:', userResp);
        const sbUser: any = userResp?.data?.user || null;

        if (accessTokenFromSession) {
          console.log('[ResetPassword] saving access_token to AsyncStorage');
          await AsyncStorage.setItem('access_token', accessTokenFromSession);
        }

        if (sbUser) {
          const uid = sbUser.id ? String(sbUser.id) : '';
          const userEmail = sbUser.email || '';
          let displayName = sbUser.user_metadata?.full_name || '';
          if (!displayName && userEmail) displayName = userEmail.split('@')[0];

          console.log('[ResetPassword] storing user info to AsyncStorage', { uid, userEmail, displayName });
          if (uid) await AsyncStorage.setItem('user_id', uid);
          if (userEmail) await AsyncStorage.setItem('user_email', userEmail);
          if (displayName) {
            await AsyncStorage.setItem('user_name', displayName);
            await AsyncStorage.setItem('cached_user_name', displayName);
            await AsyncStorage.setItem('cache_time', Date.now().toString());
          }

          // cleanup local profile cache which may belong to another user
          await AsyncStorage.removeItem('local_profile');
          await AsyncStorage.removeItem('profile_photo');
        }

        Alert.alert('Success', 'Password updated and signed in. Redirecting...');
        navigation.navigate('Main');
        return;
      } catch (e) {
        console.warn('Auto sign-in failed after password update', e);
        // fallback to login screen
        Alert.alert('Success', 'Password updated successfully. Please sign in.');
        navigation.navigate('Login');
        return;
      }
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

      {__DEV__ && (
        <TouchableOpacity
          style={[resetStyles.button, { marginTop: 12, backgroundColor: '#28a745' }]}
          onPress={async () => {
            // dev-only: quickly sign in as test user so you can verify the Main screen flow
            try {
              const { error } = await supabase.auth.signInWithPassword({ email: 'thenulahansaj12@gmail.com', password: 'test12' } as any);
              if (error) Alert.alert('Dev sign-in failed', error.message);
              else {
                const { data: sess } = await supabase.auth.getSession();
                const at = sess?.session?.access_token;
                if (at) await AsyncStorage.setItem('access_token', at);
                const { data: u } = await supabase.auth.getUser();
                const sbUser: any = u?.user || null;
                if (sbUser) {
                  await AsyncStorage.setItem('user_id', String(sbUser.id));
                  await AsyncStorage.setItem('user_email', sbUser.email || '');
                  const display = sbUser.user_metadata?.full_name || sbUser.email?.split('@')[0] || '';
                  if (display) {
                    await AsyncStorage.setItem('user_name', display);
                    await AsyncStorage.setItem('cached_user_name', display);
                    await AsyncStorage.setItem('cache_time', Date.now().toString());
                  }
                }
                Alert.alert('Dev', 'Signed in as test user');
                navigation.navigate('Main');
              }
            } catch (err) {
              Alert.alert('Dev sign-in error', String(err));
            }
          }}
        >
          <Text style={resetStyles.buttonText}>Dev: Sign in as thenulahansaj12@gmail.com</Text>
        </TouchableOpacity>
      )}
    </View>
  );
};

export default ResetPassword;
