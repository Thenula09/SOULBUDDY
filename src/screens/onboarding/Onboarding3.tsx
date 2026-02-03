import React from 'react';
import { View, Text, TouchableOpacity } from 'react-native';
import { OnboardingScreenProps } from '../../types/navigation';
import { onboarding3Styles } from './onboarding3Styles';

const Onboarding3: React.FC<OnboardingScreenProps> = ({ navigation }) => {
  return (
    <View style={onboarding3Styles.container}>
      <Text style={onboarding3Styles.title}>Chat with AI Buddy</Text>
      <Text style={onboarding3Styles.subtitle}>Get support and guidance anytime</Text>

      <TouchableOpacity
        style={onboarding3Styles.button}
        onPress={() => navigation.navigate('Register')}
      >
        <Text style={onboarding3Styles.buttonText}>Register</Text>
      </TouchableOpacity>

      <TouchableOpacity
        style={onboarding3Styles.secondaryButton}
        onPress={() => navigation.navigate('Login')}
      >
        <Text style={onboarding3Styles.secondaryButtonText}>Login</Text>
      </TouchableOpacity>
    </View>
  );
};

export default Onboarding3;