import React, { useEffect, useState, useCallback, useRef } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Animated, PanResponder } from 'react-native';
import LinearGradient from 'react-native-linear-gradient';
import { useNavigation } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import { RootStackParamList } from '../../../types/navigation';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { API_ENDPOINTS } from '../../../config/api';
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

  const load = useCallback(async () => {
    // Check cache first
    const cachedName = await AsyncStorage.getItem('cached_user_name');
    const cacheTime = await AsyncStorage.getItem('cache_time');
    const now = Date.now();
    
    // Use cache if less than 5 minutes old
    if (cachedName && cacheTime && (now - parseInt(cacheTime, 10)) < 300000) {
        setName(cachedName);
        const { getColomboHour, getGreetingForHour } = require('../../../utils/time');
        const ch = getColomboHour(new Date());
        setGreeting(getGreetingForHour(ch));
        setLoading(false);
        return;
      }

      const uid = await AsyncStorage.getItem('user_id');
      const email = await AsyncStorage.getItem('user_email');
      const userName = await AsyncStorage.getItem('user_name');
      let displayName = userName || email || 'User';
      
      console.log('HomeScreen load - uid:', uid, 'email:', email, 'userName:', userName, 'displayName:', displayName);
      
      if (uid) {
        try {
          const token = await AsyncStorage.getItem('access_token');
          const controller = new AbortController();
          const timeoutId = setTimeout(() => controller.abort(), 3000);
          
          let res;
          if (token) {
            res = await fetch(API_ENDPOINTS.USER_BY_ID(Number(uid)), {
              signal: controller.signal,
              headers: { Authorization: `Bearer ${token}` }
            });
          } else {
            res = await fetch(API_ENDPOINTS.USER_BY_ID(Number(uid)), {
              signal: controller.signal,
            });
          }
          clearTimeout(timeoutId);
          
          if (res.ok) {
            const data = await res.json();
            console.log('HomeScreen - user data:', data);
            if (data.full_name) displayName = data.full_name;
            else if (data.username) displayName = data.username;
            else if (data.email) displayName = data.email;
            
            // Cache the name
            await AsyncStorage.setItem('cached_user_name', displayName);
            await AsyncStorage.setItem('cache_time', now.toString());
            await AsyncStorage.setItem('user_name', displayName);
          }
        } catch (err) {
          console.warn('Failed to fetch profile:', err);
          // Use cached or email if fetch fails
          if (cachedName) displayName = cachedName;
          else if (userName) displayName = userName;
          else if (email) displayName = email;
        }
      } else {
        // No user ID, try to get from Supabase auth
        try {
          const { supabase } = require('../../../services/supabase');
          const { data } = await supabase.auth.getUser();
          const sbUser: any = data?.user ?? null;
          if (sbUser) {
            displayName = sbUser.user_metadata?.full_name || sbUser.email || displayName;
            await AsyncStorage.setItem('cached_user_name', displayName);
            await AsyncStorage.setItem('cache_time', now.toString());
            await AsyncStorage.setItem('user_name', displayName);
          }
        } catch (e) {
          console.warn('Failed to get Supabase user:', e);
        }
      }
      
      setName(displayName);

      // Use Colombo time for greetings
      const { getColomboHour, getGreetingForHour } = require('../../../utils/time');
      const h = getColomboHour(new Date());
      setGreeting(getGreetingForHour(h));
      setLoading(false);
  }, []);

  useEffect(() => {
    // Schedule load when the JS thread is idle — use requestIdleCallback when available,
    // otherwise fallback to a short timeout. This replaces the deprecated InteractionManager.
    let handle: any = null;
    const scheduleIdle = () => {
      if (typeof (globalThis as any).requestIdleCallback === 'function') {
        handle = (globalThis as any).requestIdleCallback(() => load());
      } else {
        // small delay to avoid jank on navigation
        handle = setTimeout(() => load(), 50);
      }
    };

    scheduleIdle();

    return () => {
      if (handle != null) {
        if (typeof (globalThis as any).cancelIdleCallback === 'function') {
          (globalThis as any).cancelIdleCallback(handle);
        } else {
          clearTimeout(handle as number);
        }
      }
    };
  }, [load]);

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
      colors={['#2344da', '#6b75d1', '#ffffff']}
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
      
      {/* Floating Chatbot Button */}
      <TouchableOpacity 
        style={styles.floatingChatbot} 
        onPress={handleChatPress}
        activeOpacity={0.8}
      >
        <Rive
          resourceName="chatbot"
          autoplay={true}
          style={styles.floatingBotAnimation}
        />
      </TouchableOpacity>
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
    color: '#ffffff',
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

  // Floating chatbot button
  floatingChatbot: {
    position: 'absolute',
    bottom: 30,
    right: 20,
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#003cff',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#1976D2',
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.4,
    shadowRadius: 8,
    elevation: 8,
  },

  // Floating bot animation
  floatingBotAnimation: {
    width: 60,
    height: 60,
  },
});

export default HomeScreen;