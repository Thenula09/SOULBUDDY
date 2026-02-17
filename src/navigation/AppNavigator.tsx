import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createStackNavigator } from '@react-navigation/stack';
import { TouchableOpacity, Text, StyleSheet } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { supabase } from '../services/supabase';
import SplashOnboarding from '../screens/onboarding/SplashOnboarding';
import Onboarding1 from '../screens/onboarding/Onboarding1';
import Onboarding2 from '../screens/onboarding/Onboarding2';
import Login from '../screens/auth/Login/Login';
import Register from '../screens/auth/Register/Register';
import ForgotPassword from '../screens/auth/ForgotPassword/ForgotPassword';
import ResetPassword from '../screens/auth/ResetPassword/ResetPassword';

import MobileVerification from '../screens/auth/MobileVerification/MobileVerification';
import OTPEntry from '../screens/auth/OTPEntry/OTPEntry';
import AdminLogin from '../screens/admin/AdminLogin/AdminLogin';
import AdminHome from '../screens/admin/AdminHome/AdminHome';
import MainTabs from './MainTabs';
import ChatScreen from '../screens/chat/Chat/ChatScreen';
import RiveAnimationDemo from '../screens/demo/RiveAnimationDemo';
import CalendarScreen from '../screens/home/Calendar/CalendarScreen';

// Back button moved out of render to avoid unstable nested components
const BackButton = ({ onPress }: { onPress: () => void }) => (
  <TouchableOpacity onPress={onPress} style={styles.backBtn}>
    <Text style={styles.backBtnText}>‹ Back</Text>
  </TouchableOpacity>
);

const Stack = createStackNavigator();

function AppNavigator() {
  const navigationRef = React.createRef<any>();

  React.useEffect(() => {
    const handleUrl = async (event: { url?: string } | string) => {
      const url = typeof event === 'string' ? event : event.url;
      if (!url) return;
      try {
        // 1) Password reset / update links (existing behavior)
        if (url.includes('reset-password') || url.includes('update-password')) {
          let accessToken: string | null = null;
          const qp = url.match('[?&](?:access_token|accessToken)=([^&]+)');
          if (qp) accessToken = decodeURIComponent(qp[1]);
          else {
            const hashMatch = url.match('#(?:.*?)(?:access_token|accessToken)=([^&]+)');
            if (hashMatch) accessToken = decodeURIComponent(hashMatch[1]);
          }
          navigationRef.current?.navigate('ResetPassword', { accessToken });
          return;
        }

        // 2) Supabase OAuth deep-link callback (soulbuddy://home or callback URL with tokens)
        // Attempt to exchange URL for a Supabase session and persist minimal user info.
        if (url.includes('soulbuddy://') || url.includes('auth/v1/callback') || url.includes('access_token') || url.includes('refresh_token')) {
          try {
            // Let Supabase parse the incoming URL (works with hash/query tokens)
            const { data, error } = await supabase.auth.getSessionFromUrl({ storeSession: true } as any);
            if (error) {
              console.warn('Supabase getSessionFromUrl error', error);
            } else {
              // fetch user/session and persist into AsyncStorage so existing app flows see login
              const sessResp = await supabase.auth.getSession();
              const userResp = await supabase.auth.getUser();
              const accessToken = sessResp?.data?.session?.access_token;
              const user = userResp?.data?.user;
              try {
                if (accessToken) await AsyncStorage.setItem('access_token', accessToken);
                if (user?.id) await AsyncStorage.setItem('user_id', String(user.id));
                if (user?.email) await AsyncStorage.setItem('user_email', user.email);
                if (user?.email) await AsyncStorage.setItem('user_name', user.email.split('@')[0]);
              } catch (e) {
                console.warn('Failed to persist supabase session to AsyncStorage', e);
              }

              // navigate into the app (Supabase redirectTo sets the deep link path)
              navigationRef.current?.navigate('Main');
            }
          } catch (ex) {
            console.warn('Error handling Supabase OAuth callback', ex);
          }
        }
      } catch (e) {
        console.warn('Failed to parse deep link', e);
      }
    };

    let sub: any = null;
    (async () => {
      const RN = await import('react-native');
      const initial = await RN.Linking.getInitialURL();
      if (initial) await handleUrl(initial);
      sub = RN.Linking.addEventListener('url', handleUrl as any);
    })();

    return () => sub?.remove?.();
  }, []);

  return (
    <NavigationContainer ref={navigationRef}>
      <Stack.Navigator
        initialRouteName="SplashOnboarding"
        screenOptions={{
          headerShown: false,
          gestureEnabled: true,
          transitionSpec: {
            open: { animation: 'timing', config: { duration: 360 } },
            close: { animation: 'timing', config: { duration: 300 } },
          },
          cardStyleInterpolator: ({ current: { progress }, layouts }) => ({
            cardStyle: {
              opacity: progress,
              transform: [
                {
                  translateY: progress.interpolate({ inputRange: [0, 1], outputRange: [10, 0] }),
                },
              ],
            },
            overlayStyle: {
              opacity: progress.interpolate({ inputRange: [0, 1], outputRange: [0, 0.25] }),
            },
          }),
        }}
      >
        <Stack.Screen name="SplashOnboarding" component={SplashOnboarding} />
        <Stack.Screen name="Onboarding1" component={Onboarding1} />
        <Stack.Screen name="Onboarding2" component={Onboarding2} />
        <Stack.Screen name="Login" component={Login} />
        <Stack.Screen name="ForgotPassword" component={ForgotPassword} />
        <Stack.Screen name="ResetPassword" component={ResetPassword} />
        <Stack.Screen name="MobileVerification" component={MobileVerification} />
        <Stack.Screen name="OTPEntry" component={OTPEntry} />
        <Stack.Screen name="Register" component={Register} />
        <Stack.Screen name="AdminLogin" component={AdminLogin} />
        <Stack.Screen name="AdminHome" component={AdminHome} options={{ headerShown: true, headerTitle: 'Admin' }} />
        <Stack.Screen name="Main" component={MainTabs} />
        <Stack.Screen name="RiveAnimationDemo" component={RiveAnimationDemo} 
          options={{ 
            headerShown: true, 
            headerTitle: 'Animation Demo',
            headerStyle: { backgroundColor: '#3498DB' },
            headerTintColor: '#fff',
            headerTitleStyle: { fontWeight: 'bold' }
          }} 
        />
        <Stack.Screen
          name="Calendar"
          component={CalendarScreen}
          options={({ navigation }) => ({
            headerShown: true,
            headerTitle: 'Calendar',
            headerStyle: { backgroundColor: '#007AFF' },
            headerTintColor: '#fff',
            headerTitleStyle: { fontWeight: 'bold' },
            headerLeft: () => <BackButton onPress={() => navigation.navigate('Main')} />,
          })}
        />

        <Stack.Screen
          name="Chat"
          component={ChatScreen}
          options={({ navigation }) => ({
            headerShown: true,
            headerTitle: 'Chat',
            headerStyle: { backgroundColor: '#007AFF' },
            headerTintColor: '#fff',
            headerTitleStyle: { fontWeight: 'bold' },
            // eslint-disable-next-line react/no-unstable-nested-components
            headerLeft: () => <BackButton onPress={() => navigation.navigate('Main')} />,
          })}
        />
      </Stack.Navigator>
    </NavigationContainer>
  );
}

const styles = StyleSheet.create({
  backBtn: { paddingLeft: 12 },
  backBtnText: { color: '#fff', fontSize: 18 },
});

export default AppNavigator; 