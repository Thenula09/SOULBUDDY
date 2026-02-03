import { StackNavigationProp } from '@react-navigation/stack';

export type RootStackParamList = {
  Onboarding1: undefined;
  Onboarding2: undefined;
  Onboarding3: undefined;
  Login: undefined;
  Register: undefined;
  Main: undefined;
  Chat: undefined;
  AdminLogin: undefined;
  AdminHome: undefined;
};

export type OnboardingNavigationProp = StackNavigationProp<RootStackParamList>;

export interface OnboardingScreenProps {
  navigation: OnboardingNavigationProp;
}

export type AuthNavigationProp = StackNavigationProp<RootStackParamList>;

export interface AuthScreenProps {
  navigation: AuthNavigationProp;
}
