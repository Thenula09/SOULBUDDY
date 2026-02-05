import React, { useEffect, useState, useCallback, useRef } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, InteractionManager, Animated, PanResponder } from 'react-native';
import LinearGradient from 'react-native-linear-gradient';
import { useNavigation } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import { RootStackParamList } from '../../../types/navigation';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { HomeSkeleton } from '../../../components/ScreenSkeletons';
import Rive from 'rive-react-native';

type HomeScreenNavigationProp = StackNavigationProp<RootStackParamList, 'Main'>;

const HomeScreen = () => {
  const navigation = useNavigation<HomeScreenNavigationProp>();
  const [name, setName] = useState<string | null>(null);
  const [greeting, setGreeting] = useState('');
  const [loading, setLoading] = useState(true);
  const [showWarning, setShowWarning] = useState(false);
  const rotateAnim = useRef(new Animated.Value(0)).current;
  const lastRotation = useRef(0);
  const headerFadeAnim = useRef(new Animated.Value(0)).current;
  const headerSlideAnim = useRef(new Animated.Value(-50)).current;
  const bounceAnim = useRef(new Animated.Value(0)).current;
  const warningFadeAnim = useRef(new Animated.Value(0)).current;

  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: () => true,
      onPanResponderMove: (_, gestureState) => {
        const rotation = lastRotation.current + gestureState.dx / 3;
        // Clamp rotation between -30 and 30 degrees
        const clampedRotation = Math.max(-30, Math.min(30, rotation));
        rotateAnim.setValue(clampedRotation);
        
        // Show warning if rotation exceeds 10 degrees
        if (Math.abs(clampedRotation) > 10) {
          if (!showWarning) {
            setShowWarning(true);
            Animated.spring(warningFadeAnim, {
              toValue: 1,
              friction: 8,
              tension: 40,
              useNativeDriver: true,
            }).start();
          }
        } else {
          if (showWarning) {
            Animated.timing(warningFadeAnim, {
              toValue: 0,
              duration: 300,
              useNativeDriver: true,
            }).start(() => setShowWarning(false));
          }
        }
      },
      onPanResponderRelease: (_, gestureState) => {
        const rotation = lastRotation.current + gestureState.dx / 3;
        lastRotation.current = Math.max(-30, Math.min(30, rotation));
      },
    })
  ).current;

  useEffect(() => {
    // Defer loading until after navigation animation
    const task = InteractionManager.runAfterInteractions(() => {
      load();
    });

    return () => task.cancel();
  }, []);

  const load = useCallback(async () => {
    // Check cache first
    const cachedName = await AsyncStorage.getItem('cached_user_name');
    const cacheTime = await AsyncStorage.getItem('cache_time');
    const now = Date.now();
    
    // Use cache if less than 5 minutes old
    if (cachedName && cacheTime && (now - parseInt(cacheTime, 10)) < 300000) {
        setName(cachedName);
        const h = new Date().getHours();
        if (h < 6) setGreeting('Good early morning');
        else if (h < 12) setGreeting('Good morning');
        else if (h < 17) setGreeting('Good afternoon');
        else if (h < 21) setGreeting('Good evening');
        else setGreeting('Hello');
        setLoading(false);
        return;
      }

      const uid = await AsyncStorage.getItem('user_id');
      const email = await AsyncStorage.getItem('user_email');
      let displayName = email;
      if (uid) {
        try {
          const controller = new AbortController();
          const timeoutId = setTimeout(() => controller.abort(), 3000);
          
          const res = await fetch(`http://10.0.2.2:8004/users/profile/${uid}`, {
            signal: controller.signal,
          });
          clearTimeout(timeoutId);
          
          if (res.ok) {
            const data = await res.json();
            if (data.full_name) displayName = data.full_name;
          }
        } catch (e) {
          // Use cached or email if fetch fails
          if (cachedName) displayName = cachedName;
        }
      }
      
      // Cache the name
      await AsyncStorage.setItem('cached_user_name', displayName || '');
      await AsyncStorage.setItem('cache_time', now.toString());
      setName(displayName);

      const h = new Date().getHours();
      if (h < 6) setGreeting('Good early morning');
      else if (h < 12) setGreeting('Good morning');
      else if (h < 17) setGreeting('Good afternoon');
      else if (h < 21) setGreeting('Good evening');
      else setGreeting('Hello');
      setLoading(false);
  }, []);

  useEffect(() => {
    if (!loading) {
      // Entrance animation
      Animated.parallel([
        Animated.timing(headerSlideAnim, {
          toValue: 0,
          duration: 800,
          useNativeDriver: true,
        }),
        Animated.spring(headerFadeAnim, {
          toValue: 1,
          friction: 8,
          tension: 40,
          useNativeDriver: true,
        }),
      ]).start(() => {
        // Start continuous bounce animation
        Animated.loop(
          Animated.sequence([
            Animated.timing(bounceAnim, {
              toValue: -10,
              duration: 1500,
              useNativeDriver: true,
            }),
            Animated.timing(bounceAnim, {
              toValue: 10,
              duration: 1500,
              useNativeDriver: true,
            }),
          ])
        ).start();
      });
    }
  }, [loading, headerSlideAnim, headerFadeAnim, bounceAnim]);

  const handleChatPress = () => {
    navigation.navigate('Chat');
  };

  const spin = rotateAnim.interpolate({
    inputRange: [-30, 30],
    outputRange: ['-30deg', '30deg'],
  });

  return (
    <LinearGradient
      colors={['#E3F2FD', '#BBDEFB', '#90CAF9']}
      style={styles.container}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
    >
      {loading ? (
        <HomeSkeleton />
      ) : (
        <View style={styles.contentContainer}>
          {!showWarning ? (
            <Animated.View
              style={{
                opacity: headerFadeAnim,
                transform: [
                  { translateY: Animated.add(headerSlideAnim, bounceAnim) },
                ],
              }}
            >
              <Text style={styles.headerText}>I am SoulBuddy</Text>
            </Animated.View>
          ) : (
            <Animated.View
              style={{
                opacity: warningFadeAnim,
                transform: [
                  { translateY: Animated.add(headerSlideAnim, bounceAnim) },
                ],
              }}
            >
              <Text style={styles.warningText}>Don't rotate me too much!</Text>
            </Animated.View>
          )}
          <View style={styles.botContainer}>
            <Animated.View
              {...panResponder.panHandlers}
              style={[styles.botWrapper, { transform: [{ rotate: spin }] }]}
            >
              <Rive
                resourceName="chatbot"
                autoplay={true}
                style={styles.botAnimation}
              />
            </Animated.View>
          </View>
          <Text style={styles.title}>{greeting}{name ? `, ${name}!` : '!'}</Text>
          <Text style={styles.subtitle}>Welcome back — ready to chat?</Text>
          <TouchableOpacity style={styles.button} onPress={handleChatPress}>
            <Text style={styles.buttonText}>Chat with SoulBuddy</Text>
          </TouchableOpacity>
        </View>
      )}
    </LinearGradient>
  );
};

const styles = StyleSheet.create({
  // Main container - full screen
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 20,
  },

  // Content wrapper - holds all elements
  contentContainer: {
    alignItems: 'center',
    width: '100%',
  },

  // Header text - "I am SoulBuddy"
  headerText: {
    fontSize: 32,
    fontWeight: '800',
    color: '#1565C0',
    marginBottom: 30,
    textAlign: 'center',
    letterSpacing: 1,
    textShadowColor: 'rgba(21, 101, 192, 0.3)',
    textShadowOffset: { width: 0, height: 3 },
    textShadowRadius: 6,
  },

  // Warning text - "Don't rotate me too much!"
  warningText: {
    fontSize: 28,
    fontWeight: '700',
    color: '#D32F2F',
    marginBottom: 30,
    textAlign: 'center',
    letterSpacing: 0.5,
    textShadowColor: 'rgba(211, 47, 47, 0.3)',
    textShadowOffset: { width: 0, height: 3 },
    textShadowRadius: 6,
  },

  // Bot container - outer wrapper for bot
  botContainer: {
    marginBottom: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },

  // Bot wrapper - handles rotation
  botWrapper: {
    width: 180,
    height: 180,
  },

  // Bot animation - Rive component style
  botAnimation: {
    width: 180,
    height: 180,
    backgroundColor: 'transparent',
  },

  // Title text - greeting with name
  title: {
    fontSize: 28,
    fontWeight: '700',
    color: '#0D47A1',
    marginBottom: 12,
    textAlign: 'center',
    textShadowColor: 'rgba(13, 71, 161, 0.2)',
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 4,
  },

  // Subtitle text - welcome message
  subtitle: {
    fontSize: 17,
    color: '#1565C0',
    marginBottom: 40,
    textAlign: 'center',
    lineHeight: 24,
  },

  // Button - chat button
  button: {
    backgroundColor: '#1976D2',
    paddingHorizontal: 32,
    paddingVertical: 16,
    borderRadius: 12,
    shadowColor: '#1976D2',
    shadowOffset: {
      width: 0,
      height: 6,
    },
    shadowOpacity: 0.4,
    shadowRadius: 10,
    elevation: 6,
  },

  // Button text - chat button label
  buttonText: {
    color: '#ffffff',
    fontSize: 18,
    fontWeight: '600',
    letterSpacing: 0.5,
  },
});

export default HomeScreen;