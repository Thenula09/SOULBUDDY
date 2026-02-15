import React, { useEffect, useRef } from 'react';
import { Text, TouchableOpacity, Animated } from 'react-native';
import { OnboardingScreenProps } from '../../types/navigation';
import { onboarding1Styles } from './onboarding1Styles';
import Rive from 'rive-react-native';

const Onboarding1: React.FC<OnboardingScreenProps> = ({ navigation }) => {
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(50)).current;
  const scaleAnim = useRef(new Animated.Value(0.8)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 1000,
        useNativeDriver: true,
      }),
      Animated.timing(slideAnim, {
        toValue: 0,
        duration: 800,
        useNativeDriver: true,
      }),
      Animated.spring(scaleAnim, {
        toValue: 1,
        tension: 50,
        friction: 8,
        useNativeDriver: true,
      }),
    ]).start();
  }, [fadeAnim, slideAnim, scaleAnim]);

  return (
    <Animated.View 
      style={[
        onboarding1Styles.container,
        {
          opacity: fadeAnim,
          transform: [{ translateY: slideAnim }]
        }
      ]}
    >      
      <Animated.View style={[onboarding1Styles.contentContainer]}>
        <Animated.View style={[onboarding1Styles.animationContainer, { transform: [{ scale: scaleAnim }] }]}>
          <Rive
            resourceName="rivebot"
            style={onboarding1Styles.animation}
          />
        </Animated.View>
        <Animated.View 
          style={[
            { opacity: fadeAnim, transform: [{ translateY: slideAnim }] }
          ]}
        >
        <Text style={onboarding1Styles.title}>
          Welcome to SOULBUDDY
        </Text>
      </Animated.View>
      <Animated.View 
        style={[
          { opacity: fadeAnim, transform: [{ translateY: slideAnim }] }
        ]}
      >
        <Text style={onboarding1Styles.subtitle}>
          Your companion for mental wellness
        </Text>
      </Animated.View>
      </Animated.View>
      
      <Animated.View style={[onboarding1Styles.buttonContainer, { opacity: fadeAnim, transform: [{ translateY: slideAnim }] }]}>
        <TouchableOpacity style={onboarding1Styles.skipButton} onPress={() => navigation.navigate('Login')}>
          <Text style={onboarding1Styles.skipButtonText}>Skip to Login</Text>
        </TouchableOpacity>
        
        <TouchableOpacity style={onboarding1Styles.button} onPress={() => navigation.navigate('Onboarding2')}>
          <Text style={onboarding1Styles.buttonText}>Next</Text>
        </TouchableOpacity>
        
        <TouchableOpacity style={onboarding1Styles.directButton} onPress={() => navigation.navigate('Register')}>
          <Text style={onboarding1Styles.directButtonText}>Get Started Now</Text>
        </TouchableOpacity>
      </Animated.View>
    </Animated.View>
  );
};

export default Onboarding1;