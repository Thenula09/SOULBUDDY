import React from 'react';
import { View, Text, TouchableOpacity } from 'react-native';
import { OnboardingScreenProps } from '../../types/navigation';
import { onboarding2Styles } from './onboarding2Styles';

const Onboarding2: React.FC<OnboardingScreenProps> = ({ navigation }) => {
  return (
    <View style={onboarding2Styles.container}>
      <Text style={onboarding2Styles.title}>Track Your Mood</Text>
      <Text style={onboarding2Styles.subtitle}>Monitor your emotional well-being daily</Text>
      <TouchableOpacity style={onboarding2Styles.button} onPress={() => navigation.navigate('Onboarding3')}>
        <Text style={onboarding2Styles.buttonText}>Next</Text>
      </TouchableOpacity>
    </View>
  );
};

export default Onboarding2;