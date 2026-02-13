import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  Dimensions,
  InteractionManager,
  Platform,
} from 'react-native';

const MOOD_ANALYTICS_HOST = Platform.OS === 'android' ? 'http://10.0.2.2:8003' : 'http://10.190.154.90:8003';
import { PieChart } from 'react-native-chart-kit';
import AsyncStorage from '@react-native-async-storage/async-storage';
import MoodTimelineChart from '../../../components/MoodTimelineChart';
import { LifestyleSkeleton } from '../../../components/ScreenSkeletons';

const screenWidth = Dimensions.get('window').width;

type MoodAnalytics = {
  time_slot: string;
  happy_count: number;
  sad_count: number;
  angry_count: number;
  stress_count: number;
  neutral_count: number;
  total_count: number;
  average_score: number;
};

const LifestyleScreen = React.memo(() => {
  const [loading, setLoading] = useState(true);
  const [_moodData, _setMoodData] = useState<MoodAnalytics[]>([]);
  const [dominantEmotion, setDominantEmotion] = useState('');
  const [_bucketInterval, _setBucketInterval] = useState<number | null>(null);
  const [pieData, setPieData] = useState<any[]>([]);

  const fetchMoodAnalytics = useCallback(async () => {
    try {
      // Check cache first (5 min TTL)
      const cached = await AsyncStorage.getItem('cached_mood_analytics');
      const cacheTime = await AsyncStorage.getItem('mood_analytics_cache_time');
      const now = Date.now();
      
      if (cached && cacheTime && (now - parseInt(cacheTime, 10)) < 300000) {
        const data = JSON.parse(cached);
        _setMoodData(data);
        
        // Calculate dominant emotion
        const totals = {
          Happy: 0,
          Sad: 0,
          Angry: 0,
          Stress: 0,
          Neutral: 0,
        };
        data.forEach((slot: any) => {
          totals.Happy += slot.happy_count;
          totals.Sad += slot.sad_count;
          totals.Angry += slot.angry_count;
          totals.Stress += slot.stress_count;
          totals.Neutral += slot.neutral_count;
        });
        const dominant = Object.entries(totals).reduce((a, b) => (a[1] > b[1] ? a : b))[0];
        setDominantEmotion(dominant);
        setLoading(false);
        return;
      }
      
      setLoading(true);
      const accessToken = await AsyncStorage.getItem('access_token');
      
      if (!accessToken) {
        console.log('No access token found');
        setLoading(false);
        return;
      }

      const response = await fetch(`${MOOD_ANALYTICS_HOST}/api/mood/weekly/1`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        console.error('Failed to fetch mood analytics');
        setLoading(false);
        return;
      }

      const responseData = await response.json();
      
      console.log('Weekly mood data received:', responseData);
      
      // Backend returns: {user_id, period, total_entries, emotions, dominant_emotion, sources, moods}
      const emotions = responseData.emotions || {};
      const fetchedDominantEmotion = responseData.dominant_emotion || 'Neutral';
      
      // Cache the data
      await AsyncStorage.setItem('cached_mood_analytics', JSON.stringify(responseData));
      await AsyncStorage.setItem('mood_analytics_cache_time', now.toString());
      
      setDominantEmotion(fetchedDominantEmotion);
      
      // Build pie chart data from emotions
      const palette: any = {
        Happy: '#4CAF50',
        Sad: '#2196F3',
        Angry: '#F44336',
        Stressed: '#FF9800',
        Neutral: '#9E9E9E',
        Anxious: '#9C27B0',
        Excited: '#FF5722',
      };

      const pie: any[] = [];
      Object.entries(emotions).forEach(([name, value]) => {
        if ((value as number) > 0) {
          pie.push({
            name,
            population: value,
            color: palette[name] || '#ccc',
            legendFontColor: '#333',
            legendFontSize: 12,
          });
        }
      });
      
      setPieData(pie);

      setLoading(false);
    } catch (error) {
      console.error('Error fetching mood analytics:', error);
      setLoading(false);
    }
  }, []);

  // Fetch entries for last 24 hours and build pie chart data (client-side)
  const fetchLast24HourDistribution = useCallback(async () => {
    try {
      // Check cache first (5 min TTL)
      const cached = await AsyncStorage.getItem('cached_pie_data');
      const cacheTime = await AsyncStorage.getItem('pie_data_cache_time');
      const currentTime = Date.now();
      
      if (cached && cacheTime && (currentTime - parseInt(cacheTime, 10)) < 300000) {
        setPieData(JSON.parse(cached));
        return;
      }
      
      const accessToken = await AsyncStorage.getItem('access_token');
      if (!accessToken) return;

      // Use week endpoint (covers last 7 days) and filter client-side for last 24h
      const resp = await fetch('http://10.0.2.2:8004/users/mood/week', {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
      });

      if (!resp.ok) {
        console.error('Failed to fetch week moods');
        return;
      }

      const json = await resp.json();
      // normalize response to an array — backend may return { moods: [...] } or { data: [...] }
      const items = Array.isArray(json)
        ? json
        : Array.isArray(json.moods)
        ? json.moods
        : Array.isArray(json.data)
        ? json.data
        : [];

      if (!Array.isArray(items)) {
        console.warn('Expected array for week moods — normalized to empty array. Server response:', json);
      }

      if (items.length === 0) {
        console.warn('No mood data available for the last 24 hours.');
      }

      const now = new Date();
      const since = new Date(now.getTime() - 24 * 60 * 60 * 1000);

      const counts: { [key: string]: number } = {};
      const EMOTIONS = ['Happy','Sad','Angry','Stress','Neutral','Fear','Surprised','Disgust'];
      EMOTIONS.forEach((e) => (counts[e] = 0));

      items.forEach((it: any) => {
        if (it && it.ts && it.emotion) {
          const ts = new Date(it.ts);
          if (ts >= since && ts <= now) {
            const emotion = (it.emotion.charAt(0).toUpperCase() + it.emotion.slice(1)) || 'Neutral';
            if (!counts[emotion]) counts[emotion] = 0;
            counts[emotion] += 1;
          }
        } else {
          console.warn('Invalid item structure in mood data:', it);
        }
      });

      const palette = {
        Happy: '#4CAF50',
        Sad: '#2196F3',
        Angry: '#F44336',
        Stress: '#FF9800',
        Neutral: '#9E9E9E',
        Fear: '#9C27B0',
        Surprised: '#FF9800',
        Disgust: '#795548',
      } as any;

      const pie: any[] = [];
      Object.entries(counts).forEach(([name, value]) => {
        if (value > 0) {
          pie.push({
            name,
            population: value,
            color: palette[name] || '#ccc',
            legendFontColor: '#333',
            legendFontSize: 12,
          });
        }
      });

      if (pie.length === 0) {
        console.warn('No pie chart data generated. Counts:', counts);
      }

      const currentTimestamp = Date.now();
      await AsyncStorage.setItem('cached_pie_data', JSON.stringify(pie));
      await AsyncStorage.setItem('pie_data_cache_time', currentTimestamp.toString());
      
      setPieData(pie);
    } catch (error) {
      console.error('Error building 24h distribution:', error);
    }
  }, []);

  useEffect(() => {
    // Wait for navigation animation to complete before loading data
    const task = InteractionManager.runAfterInteractions(() => {
      fetchMoodAnalytics();
      fetchLast24HourDistribution();
    });

    return () => task.cancel();
  }, [fetchMoodAnalytics, fetchLast24HourDistribution]);

  const getEmotionColor = (emotion: string) => {
    switch (emotion) {
      case 'Happy':
        return '#4CAF50'; // Green
      case 'Sad':
        return '#2196F3'; // Blue
      case 'Angry':
        return '#F44336'; // Red
      case 'Stress':
        return '#FF9800'; // Orange
      default:
        return '#9E9E9E'; // Gray
    }
  };

  const getHealthAdvice = () => {
    if (!dominantEmotion) return null;

    const advice: { [key: string]: string } = {
      Stress:
        'ඔබ අද දවසේ වැඩිපුර Stress එකකින් සිටි බව පෙනේ. මෙය ගැස්ට්‍රයිටිස් වැනි තත්ත්වයන්ට බලපෑ හැකියි. කරුණාකර මදක් විවේක ගන්න.',
      Sad:
        'ඔබ අද දුකින් සිටි බව පෙනේ. මානසික සෞඛ්‍යය සඳහා හිතවත් අයක් සමඟ කතා කිරීම හෝ ප්‍රියතම ක්‍රියාකාරකමක නිරත වීම උපකාරී වේ.',
      Angry:
        'ඔබ අද කෝපයෙන් සිටි බව පෙනේ. ගැඹුරු හුස්ම ගැනීම සහ සන්සුන්ව සිතීම හෘද සෞඛ්‍යය සඳහා හොඳයි.',
      Happy:
        'ඔබ අද සතුටින් සිටින බව පෙනේ! මෙය ඔබේ සමස්ත සෞඛ්‍යය සඳහා ඉතා හොඳයි. දිගටම සතුටින් සිටින්න!',
    };

    return advice[dominantEmotion] || null;
  };

  if (loading) {
    return <LifestyleSkeleton />;
  }

  return (
    <ScrollView style={styles.container}>
      <Text style={styles.header}>Daily Mood Analysis</Text>
      <Text style={styles.subtitle}>ඔබේ හැඟීම් වෙනස්වීම් දවස පුරා</Text>

      {/* Pie chart: distribution of emotions in the last 24 hours */}
      <View style={styles.pieContainer}>
        <Text style={styles.pieTitle}>Last 24h emotion distribution</Text>
        {pieData && pieData.length > 0 ? (
          <PieChart
            data={pieData}
            width={screenWidth - 40}
            height={220}
            chartConfig={{
              color: (opacity = 1) => `rgba(0, 0, 0, ${opacity})`,
            }}
            accessor="population"
            backgroundColor="transparent"
            paddingLeft="15"
            absolute
          />
        ) : (
          <Text style={styles.emptyText}>No mood data in the last 24 hours</Text>
        )}
      </View>

      {/* (Average mood chart removed) */}

      {/* 5-minute timeline: show each entry as a colored bar (time shown for each bar) */}
      <View style={styles.timelineContainer}>
        <Text style={styles.timelineTitle}>5-min Mood Timeline</Text>
        <MoodTimelineChart />
      </View>

      {dominantEmotion && (
        <View style={styles.emotionCard}>
          <Text style={styles.emotionTitle}>Today's Dominant Emotion</Text>
          <View
            style={[
              styles.emotionBadge,
              { backgroundColor: getEmotionColor(dominantEmotion) },
            ]}
          >
            <Text style={styles.emotionText}>{dominantEmotion}</Text>
          </View>
        </View>
      )}

      {getHealthAdvice() && (
        <View style={styles.adviceCard}>
          <Text style={styles.adviceTitle}>සෞඛ්‍ය උපදෙස්</Text>
          <Text style={styles.adviceText}>{getHealthAdvice()}</Text>
        </View>
      )}

      {/* Emotion legend */}

      {/* Emotion legend */}
      <View style={styles.legendContainer}>
        <Text style={styles.legendTitle}>Emotion Legend</Text>
        <View style={styles.legendRow}>
          <View style={styles.legendItem}>
            <View style={[styles.legendColor, styles.happyColor]} />
            <Text style={styles.legendText}>😊 Happy</Text>
          </View>
          <View style={styles.legendItem}>
            <View style={[styles.legendColor, styles.sadColor]} />
            <Text style={styles.legendText}>😔 Sad</Text>
          </View>
        </View>
        <View style={styles.legendRow}>
          <View style={styles.legendItem}>
            <View style={[styles.legendColor, styles.angryColor]} />
            <Text style={styles.legendText}>😡 Angry</Text>
          </View>
          <View style={styles.legendItem}>
            <View style={[styles.legendColor, styles.stressColor]} />
            <Text style={styles.legendText}>😰 Stress</Text>
          </View>
        </View>
      </View>
    </ScrollView>
  );
});

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F5F5F5',
    padding: 20,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#F5F5F5',
  },
  loadingText: {
    marginTop: 10,
    fontSize: 16,
    color: '#666',
  },
  header: {
    fontSize: 24,
    fontWeight: 'bold',
    textAlign: 'center',
    marginTop: 20,
    color: '#333',
  },
  subtitle: {
    fontSize: 14,
    textAlign: 'center',
    marginTop: 5,
    marginBottom: 20,
    color: '#666',
  },
  pieContainer: {
    backgroundColor: '#FFF',
    borderRadius: 16,
    padding: 10,
    marginBottom: 10,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  pieTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 12,
    color: '#333',
  },
  emptyText: {
    fontSize: 14,
    color: '#777',
  },
  chartContainer: {
    backgroundColor: '#FFF',
    borderRadius: 16,
    padding: 10,
    marginBottom: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  chart: {
    marginVertical: 8,
    borderRadius: 16,
  },
  chartNote: {
    padding: 10,
    color: '#999',
    fontSize: 12,
    textAlign: 'center',
    fontStyle: 'italic',
  },
  emotionCard: {
    backgroundColor: '#FFF',
    borderRadius: 12,
    padding: 20,
    marginTop: 20,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  emotionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 10,
  },
  emotionBadge: {
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 20,
  },
  emotionText: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#FFF',
  },
  adviceCard: {
    backgroundColor: '#FFF3E0',
    borderRadius: 12,
    padding: 20,
    marginTop: 20,
    borderLeftWidth: 4,
    borderLeftColor: '#FF9800',
  },
  adviceTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#E65100',
    marginBottom: 10,
  },
  adviceText: {
    fontSize: 14,
    color: '#333',
    lineHeight: 20,
  },
  legendContainer: {
    backgroundColor: '#FFF',
    borderRadius: 12,
    padding: 20,
    marginTop: 20,
    marginBottom: 40,
  },
  legendTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 15,
  },
  legendRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginBottom: 10,
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  legendColor: {
    width: 20,
    height: 20,
    borderRadius: 4,
    marginRight: 8,
  },
  legendText: {
    fontSize: 14,
    color: '#666',
  },
  timelineContainer: {
    marginTop: 12,
  },
  timelineTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 8,
  },
  happyColor: {
    backgroundColor: '#4CAF50',
  },
  sadColor: {
    backgroundColor: '#2196F3',
  },
  angryColor: {
    backgroundColor: '#F44336',
  },
  stressColor: {
    backgroundColor: '#FF9800',
  },
});

export default LifestyleScreen;
