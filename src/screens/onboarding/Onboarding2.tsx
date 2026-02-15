import React, { useEffect, useRef } from 'react';
import { Text, TouchableOpacity, Animated } from 'react-native';
import { OnboardingScreenProps } from '../../types/navigation';
import { onboarding2Styles } from './onboarding2Styles';
import Rive from 'rive-react-native';

const Onboarding2: React.FC<OnboardingScreenProps> = ({ navigation }) => {
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
        onboarding2Styles.container,
        {
          opacity: fadeAnim,
          transform: [{ translateY: slideAnim }]
        }
      ]}
    >
      <Animated.View style={[onboarding2Styles.contentContainer]}>
        <Animated.View style={[onboarding2Styles.animationContainer, { transform: [{ scale: scaleAnim }] }]}>
          <Rive
            resourceName="noback2"
            style={onboarding2Styles.animation}
          />
        </Animated.View>
        <Animated.View 
          style={[
            { opacity: fadeAnim, transform: [{ translateY: slideAnim }] }
          ]}
        >
        <Text style={onboarding2Styles.title}>
          Track Your Mood
        </Text>
      </Animated.View>
      <Animated.View 
        style={[
          { opacity: fadeAnim, transform: [{ translateY: slideAnim }] }
        ]}
      >
        <Text style={onboarding2Styles.subtitle}>
          Monitor your emotional well-being daily
        </Text>
      </Animated.View>
      </Animated.View>
      
      <Animated.View style={[onboarding2Styles.buttonContainer, { opacity: fadeAnim, transform: [{ translateY: slideAnim }] }]}>
        <TouchableOpacity style={onboarding2Styles.skipButton} onPress={() => navigation.navigate('Login')}>
          <Text style={onboarding2Styles.skipButtonText}>Skip to Login</Text>
        </TouchableOpacity>
        
        <TouchableOpacity style={onboarding2Styles.button} onPress={() => navigation.navigate('Login')}>
          <Text style={onboarding2Styles.buttonText}>Next</Text>
        </TouchableOpacity>
        
        <TouchableOpacity style={onboarding2Styles.directButton} onPress={() => navigation.navigate('Register')}>
          <Text style={onboarding2Styles.directButtonText}>Get Started Now</Text>
        </TouchableOpacity>
      </Animated.View>
    </Animated.View>
  );
};

export default Onboarding2;