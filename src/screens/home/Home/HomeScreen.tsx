import React, { useEffect, useState, useCallback } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, InteractionManager } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import { RootStackParamList } from '../../../types/navigation';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { HomeSkeleton } from '../../../components/ScreenSkeletons';

type HomeScreenNavigationProp = StackNavigationProp<RootStackParamList, 'Main'>;

const HomeScreen = () => {
  const navigation = useNavigation<HomeScreenNavigationProp>();
  const [name, setName] = useState<string | null>(null);
  const [greeting, setGreeting] = useState('');
  const [loading, setLoading] = useState(true);

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

  const handleChatPress = () => {
    navigation.navigate('Chat');
  };

  return (
    <View style={styles.container}>
      {loading ? (
        <HomeSkeleton />
      ) : (
        <View style={styles.contentContainer}>
          <Text style={styles.title}>{greeting}{name ? `, ${name}!` : '!'}</Text>
          <Text style={styles.subtitle}>Welcome back — ready to chat?</Text>
          <TouchableOpacity style={styles.button} onPress={handleChatPress}>
            <Text style={styles.buttonText}>Chat with SoulBuddy</Text>
          </TouchableOpacity>
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f5f5f5',
  },
  contentContainer: {
    alignItems: 'center',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 10,
  },
  subtitle: {
    fontSize: 16,
    color: '#666',
    marginBottom: 30,
  },
  button: {
    backgroundColor: '#007AFF',
    paddingHorizontal: 20,
    paddingVertical: 15,
    borderRadius: 8,
  },
  buttonText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
  },
});

export default HomeScreen;