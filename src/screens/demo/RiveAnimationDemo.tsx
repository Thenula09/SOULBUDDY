import React, { useEffect, useRef, useState } from 'react';
import { View, Text, TouchableOpacity, Animated, ScrollView } from 'react-native';
import { StackNavigationProp } from '@react-navigation/stack';
import { RootStackParamList } from '../../types/navigation';
import Rive from 'rive-react-native';
import RiveAnimationComponent from '../../components/RiveAnimationComponent';
import { riveAnimationDemoStyles } from './riveAnimationDemoStyles';

type RiveAnimationDemoScreenNavigationProp = StackNavigationProp<RootStackParamList, 'RiveAnimationDemo'>;

type Props = {
  navigation: RiveAnimationDemoScreenNavigationProp;
};

const RiveAnimationDemo: React.FC<Props> = ({ navigation }) => {
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(50)).current;
  const scaleAnim = useRef(new Animated.Value(0.8)).current;
  const [currentAnimation, setCurrentAnimation] = useState('rivebot');

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
  }, []);

  return (
    <ScrollView contentContainerStyle={riveAnimationDemoStyles.scrollContainer}>
      <Animated.View 
        style={[
          riveAnimationDemoStyles.container,
          {
            opacity: fadeAnim,
            transform: [{ translateY: slideAnim }]
          }
        ]}
      >
        <Animated.View style={{ transform: [{ scale: scaleAnim }] }}>
          <Rive
            resourceName={currentAnimation}
            style={riveAnimationDemoStyles.animation}
            autoplay={true}
          />
        </Animated.View>
        
        <Animated.View 
          style={[
            { opacity: fadeAnim, transform: [{ translateY: slideAnim }] }
          ]}
        >
          <Text style={riveAnimationDemoStyles.title}>
            Rive Animation Demo
          </Text>
        </Animated.View>
        
        <Animated.View 
          style={[
            { opacity: fadeAnim, transform: [{ translateY: slideAnim }] }
          ]}
        >
          <Text style={riveAnimationDemoStyles.subtitle}>
            Currently showing: {currentAnimation}
          </Text>
        </Animated.View>

        <View style={riveAnimationDemoStyles.buttonContainer}>
          <TouchableOpacity 
            style={[
              riveAnimationDemoStyles.animationButton,
              currentAnimation === 'noback2' && riveAnimationDemoStyles.activeButton
            ]} 
            onPress={() => setCurrentAnimation('noback2')}
          >
            <Text style={[
              riveAnimationDemoStyles.animationButtonText,
              currentAnimation === 'noback2' && riveAnimationDemoStyles.activeButtonText
            ]}>
              New Animation
            </Text>
          </TouchableOpacity>

          <TouchableOpacity 
            style={[
              riveAnimationDemoStyles.animationButton,
              currentAnimation === 'noback' && riveAnimationDemoStyles.activeButton
            ]} 
            onPress={() => setCurrentAnimation('noback')}
          >
            <Text style={[
              riveAnimationDemoStyles.animationButtonText,
              currentAnimation === 'noback' && riveAnimationDemoStyles.activeButtonText
            ]}>
              Original Animation
            </Text>
          </TouchableOpacity>

          <TouchableOpacity 
            style={[
              riveAnimationDemoStyles.animationButton,
              currentAnimation === 'chatbot' && riveAnimationDemoStyles.activeButton
            ]} 
            onPress={() => setCurrentAnimation('chatbot')}
          >
            <Text style={[
              riveAnimationDemoStyles.animationButtonText,
              currentAnimation === 'chatbot' && riveAnimationDemoStyles.activeButtonText
            ]}>
              Chatbot Animation
            </Text>
          </TouchableOpacity>
        </View>

        <Text style={riveAnimationDemoStyles.componentTitle}>
          Reusable Animation Component:
        </Text>
        
        <RiveAnimationComponent 
          resourceName={currentAnimation}
          width={150}
          height={150}
          autoplay={true}
        />
        
        <Animated.View style={{ opacity: fadeAnim, transform: [{ translateY: slideAnim }] }}>
          <TouchableOpacity 
            style={riveAnimationDemoStyles.button} 
            onPress={() => navigation.goBack()}
          >
            <Text style={riveAnimationDemoStyles.buttonText}>Back</Text>
          </TouchableOpacity>
        </Animated.View>
      </Animated.View>
    </ScrollView>
  );
};

export default RiveAnimationDemo;