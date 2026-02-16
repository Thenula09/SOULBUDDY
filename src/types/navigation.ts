import { StackNavigationProp } from '@react-navigation/stack';

export type RootStackParamList = {
  Onboarding1: undefined;
  Onboarding2: undefined;
  Login: undefined;
  ForgotPassword: undefined;
  ResetPassword: { accessToken?: string } | undefined;
  MobileVerification: undefined;
  OTPEntry: { phone?: string; code?: string } | undefined;
  Register: undefined;
  Main: { initialTab?: string } | undefined;
  Chat: undefined;
  AdminLogin: undefined;
  AdminHome: undefined;
  RiveAnimationDemo: undefined;
};

export type OnboardingNavigationProp = StackNavigationProp<RootStackParamList>;

export interface OnboardingScreenProps {
  navigation: OnboardingNavigationProp;
}

export type AuthNavigationProp = StackNavigationProp<RootStackParamList>;

export interface AuthScreenProps {
  navigation: AuthNavigationProp;
}
