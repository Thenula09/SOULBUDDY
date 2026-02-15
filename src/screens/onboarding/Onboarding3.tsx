import React, { useEffect, useRef } from 'react';
import { Text, TouchableOpacity, Animated } from 'react-native';
import { OnboardingScreenProps } from '../../types/navigation';
import { onboarding3Styles } from './onboarding3Styles';
import Rive from 'rive-react-native';

const Onboarding3: React.FC<OnboardingScreenProps> = ({ navigation }) => {
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(50)).current;
  const scaleAnim = useRef(new Animated.Value(0.8)).current;
  const buttonAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.sequence([
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
      ]),
      Animated.timing(buttonAnim, {
        toValue: 1,
        duration: 500,
        useNativeDriver: true,
      }),
    ]).start();
  }, [buttonAnim, fadeAnim, scaleAnim, slideAnim]);

  return (
    <Animated.View 
      style={[
        onboarding3Styles.container,
        {
          opacity: fadeAnim,
          transform: [{ translateY: slideAnim }]
        }
      ]}
    >
      <Animated.View style={{ transform: [{ scale: scaleAnim }] }}>
        <Rive
          resourceName="noback"
          style={{ width: 300, height: 300 }}
        />
      </Animated.View>
      <Animated.View 
        style={[
          { opacity: fadeAnim, transform: [{ translateY: slideAnim }] }
        ]}
      >
        <Text style={onboarding3Styles.title}>
          Chat with AI Buddy
        </Text>
      </Animated.View>
      <Animated.View 
        style={[
          { opacity: fadeAnim, transform: [{ translateY: slideAnim }] }
        ]}
      >
        <Text style={onboarding3Styles.subtitle}>
          Get support and guidance anytime
        </Text>
      </Animated.View>

      <Animated.View style={[onboarding3Styles.buttonContainer, { opacity: buttonAnim }]}>
        <TouchableOpacity
          style={onboarding3Styles.demoButton}
          onPress={() => navigation.navigate('RiveAnimationDemo')}
        >
          <Text style={onboarding3Styles.demoButtonText}>🎨 View New Animation</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={onboarding3Styles.button}
          onPress={() => navigation.navigate('Register')}
        >
          <Text style={onboarding3Styles.buttonText}>Get Started</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={onboarding3Styles.secondaryButton}
          onPress={() => navigation.navigate('Login')}
        >
          <Text style={onboarding3Styles.secondaryButtonText}>Already have an account?</Text>
        </TouchableOpacity>
      </Animated.View>
    </Animated.View>
  );
};

export default Onboarding3;