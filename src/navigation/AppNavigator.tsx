import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createStackNavigator } from '@react-navigation/stack';
import { TouchableOpacity, Text, StyleSheet } from 'react-native';
import Onboarding1 from '../screens/onboarding/Onboarding1';
import Onboarding2 from '../screens/onboarding/Onboarding2';
import Login from '../screens/auth/Login/Login';
import Register from '../screens/auth/Register/Register';
import ForgotPassword from '../screens/auth/ForgotPassword/ForgotPassword';
import ChooseRecovery from '../screens/auth/ChooseRecovery/ChooseRecovery';
import MobileVerification from '../screens/auth/MobileVerification/MobileVerification';
import OTPEntry from '../screens/auth/OTPEntry/OTPEntry';
import AdminLogin from '../screens/admin/AdminLogin/AdminLogin';
import AdminHome from '../screens/admin/AdminHome/AdminHome';
import MainTabs from './MainTabs';
import ChatScreen from '../screens/chat/Chat/ChatScreen';
import RiveAnimationDemo from '../screens/demo/RiveAnimationDemo';

// Back button moved out of render to avoid unstable nested components
const BackButton = ({ onPress }: { onPress: () => void }) => (
  <TouchableOpacity onPress={onPress} style={styles.backBtn}>
    <Text style={styles.backBtnText}>‹ Back</Text>
  </TouchableOpacity>
);

const Stack = createStackNavigator();

function AppNavigator() {
  return (
    <NavigationContainer>
      <Stack.Navigator
        initialRouteName="Onboarding1"
        screenOptions={{
          headerShown: false,
          cardStyleInterpolator: ({ current: { progress } }) => ({
            cardStyle: {
              opacity: progress,
            },
          }),
        }}
      >
        <Stack.Screen name="Onboarding1" component={Onboarding1} />
        <Stack.Screen name="Onboarding2" component={Onboarding2} />
        <Stack.Screen name="Login" component={Login} />
        <Stack.Screen name="ForgotPassword" component={ForgotPassword} />
        <Stack.Screen name="ChooseRecovery" component={ChooseRecovery} />
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