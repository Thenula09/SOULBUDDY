import React from 'react';
import { View, Text, TouchableOpacity } from 'react-native';
import { OnboardingScreenProps } from '../../types/navigation';
import { onboarding1Styles } from './onboarding1Styles';

const Onboarding1: React.FC<OnboardingScreenProps> = ({ navigation }) => {
  return (
    <View style={onboarding1Styles.container}>
      <Text style={onboarding1Styles.title}>Welcome to SOULBUDDY</Text>
      <Text style={onboarding1Styles.subtitle}>Your companion for mental wellness</Text>
      <TouchableOpacity style={onboarding1Styles.button} onPress={() => navigation.navigate('Onboarding2')}>
        <Text style={onboarding1Styles.buttonText}>Next</Text>
      </TouchableOpacity>
    </View>
  );
};

export default Onboarding1;