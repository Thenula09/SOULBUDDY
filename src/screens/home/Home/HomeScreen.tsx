import React, { useEffect, useState, useCallback, useRef } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Animated, PanResponder } from 'react-native';
import LinearGradient from 'react-native-linear-gradient';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { API_ENDPOINTS, fetchWithTimeout } from '../../../config/api';
import { HomeSkeleton } from '../../../components/ScreenSkeletons';
import Rive from 'rive-react-native';

const HomeScreen = () => {
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

  const [weather, setWeather] = React.useState<null | { temp?: number; max?: number; min?: number; condition?: string; city?: string }>(null);
  const [weatherLoading, setWeatherLoading] = React.useState(false);

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
    let displayName = email;
    if (uid) {
      try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 3000);

        const res = await fetch(API_ENDPOINTS.USER_BY_ID(Number(uid)), {
          signal: controller.signal,
        });
        clearTimeout(timeoutId);

        if (res.ok) {
          const data = await res.json();
          if (data.full_name) displayName = data.full_name;
          else if (data.username) displayName = data.username;
        }
      } catch (err) {
        console.warn('Failed to fetch profile:', err);
        // Use cached or email if fetch fails
        if (cachedName) displayName = cachedName;
      }
    }

    // Cache the name
    await AsyncStorage.setItem('cached_user_name', displayName || '');
    await AsyncStorage.setItem('cache_time', now.toString());
    setName(displayName);

    // Use Colombo time for greetings
    const { getColomboHour, getGreetingForHour } = require('../../../utils/time');
    const h = getColomboHour(new Date());
    setGreeting(getGreetingForHour(h));
    setLoading(false);
  }, []);

  const mapWeatherCode = (code: number | undefined) => {
    if (code == null) return 'Unknown';
    if (code === 0) return 'Clear';
    if (code === 1 || code === 2) return 'Partly Cloudy';
    if (code === 3) return 'Overcast';
    if (code === 45 || code === 48) return 'Fog';
    if ([51, 53, 55, 56, 57].includes(code)) return 'Drizzle';
    if ([61, 63, 65, 66, 67].includes(code)) return 'Rain';
    if ([71, 73, 75, 77].includes(code)) return 'Snow';
    if ([80, 81, 82].includes(code)) return 'Showers';
    if ([95, 96, 99].includes(code)) return 'Thunderstorm';
    return 'Unknown';
  };

  const fetchWeather = React.useCallback(async (lat = 6.9271, lon = 79.8612, cityName = 'Sri Lanka') => {
    try {
      setWeatherLoading(true);
      const url = `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&current_weather=true&daily=temperature_2m_max,temperature_2m_min&timezone=auto`;
      const res = await fetchWithTimeout(url, {}, 8000);
      if (!res.ok) throw new Error('weather fetch failed');
      const j = await res.json();
      const current = j.current_weather;
      const daily = j.daily || {};
      const temp = current?.temperature;
      const code = current?.weathercode;
      const max = Array.isArray(daily.temperature_2m_max) ? daily.temperature_2m_max[0] : undefined;
      const min = Array.isArray(daily.temperature_2m_min) ? daily.temperature_2m_min[0] : undefined;
      const condition = mapWeatherCode(code);
      setWeather({ temp, max, min, condition, city: cityName });
    } catch (err) {
      console.warn('Failed to fetch weather', err);
    } finally {
      setWeatherLoading(false);
    }
  }, []);


  useEffect(() => {
    // Schedule load when the JS thread is idle — prefer requestIdleCallback when available,
    // otherwise fallback to a short timeout. Avoid referencing `global` directly for TS safety.
    let handle: any = null;
    const scheduleIdle = () => {
      const ric = (globalThis as any)?.requestIdleCallback;
      if (typeof ric === 'function') {
        handle = ric(() => load());
      } else {
        // small delay to avoid jank on navigation
        handle = setTimeout(() => load(), 50);
      }
    };

    scheduleIdle();

    return () => {
      if (handle != null) {
        const cancel = (globalThis as any)?.cancelIdleCallback;
        if (typeof cancel === 'function') {
          cancel(handle);
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

      // fetch live weather once screen is ready
      fetchWeather().catch(() => {});
    }
  }, [loading, headerSlideAnim, headerFadeAnim, bounceAnim, fetchWeather]);



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
          {/* Weather card at top (design from provided SVG/CSS) */}
          <View style={styles.weatherWrapper}>
            <LinearGradient
              colors={[ '#5936B4', '#362A84' ]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={styles.weatherCard}
            >
              <TouchableOpacity style={styles.weatherRefresh} onPress={() => fetchWeather()} accessibilityLabel="Refresh weather">
                <Text style={styles.weatherRefreshText}>⟳</Text>
              </TouchableOpacity>

              <Text style={styles.weatherCloud}>{weather ? (weather.condition && weather.condition.toLowerCase().includes('rain') ? '🌧️' : weather.condition && weather.condition.toLowerCase().includes('snow') ? '❄️' : '☁️') : '☁️'}</Text>

              <Text style={styles.weatherTemp}>{weather && typeof weather.temp === 'number' ? `${Math.round(weather.temp)}°` : '—'}</Text>

              <View style={styles.weatherInfo}>
                <View style={styles.weatherInfoLeft}>
                  <Text style={styles.weatherGray}>{weather && weather.max ? `H:${Math.round(weather.max)}° L:${weather.min ? Math.round(weather.min) : '—'}°` : 'H:--° L:--°'}</Text>
                  <Text style={styles.weatherLocation}>{weather?.city ?? 'Sri Lanka'}</Text>
                </View>
                <Text style={styles.weatherCondition}>{weather?.condition ?? (weatherLoading ? 'Updating…' : '—')}</Text>
              </View>
            </LinearGradient>
          </View>
     <Text style={styles.title}>{greeting}{name ? `, ${name}!` : '!'}</Text>
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
    marginBottom: 10,
    marginTop: 30,
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
    marginBottom: 10,
    textAlign: 'center',
    letterSpacing: 0.5,
    textShadowColor: 'rgba(211, 47, 47, 0.3)',
    textShadowOffset: { width: 0, height: 3 },
    textShadowRadius: 6,
  },

  // Bot container - outer wrapper for bot
  botContainer: {
    marginBottom: 30,
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
    marginTop: 20,
    marginBottom: -12,
    textAlign: 'center',
    textShadowColor: 'rgba(13, 71, 161, 0.2)',
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 4,
  },

  // Subtitle text - welcome message
  subtitle: {
    fontSize: 17,
    color: '#ffffff',
    marginBottom: 24,
    textAlign: 'center',
    lineHeight: 24,
  },

  /* --- Weather card (home top) --- */
  weatherWrapper: { width: '100%', alignItems: 'center', marginBottom: 10 ,marginTop: -150},
  
  weatherCard: { width: '100%', borderRadius: 12, padding: 20, height: 184, position: 'relative', overflow: 'hidden', justifyContent: 'space-between' },
  weatherRefresh: { position: 'absolute', left: 12, top: 12, backgroundColor: 'rgba(255,255,255,0.08)', paddingHorizontal: 8, paddingVertical: 6, borderRadius: 8, zIndex: 3 },
  weatherRefreshText: { color: '#fff', fontWeight: '600' },
  weatherCloud: { position: 'absolute', right: 12, top: -12, fontSize: 64, opacity: 0.95 },
  weatherTemp: { fontSize: 48, color: '#fff', zIndex: 2, fontWeight: '700' },
  weatherInfo: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-end' },
  weatherInfoLeft: { flexDirection: 'column' },
  weatherGray: { color: 'rgba(235,235,245,0.60)' },
  weatherLocation: { color: '#fff', marginTop: 4 },
  weatherCondition: { color: '#fff', fontSize: 14, alignSelf: 'flex-end' },


});

export default HomeScreen;