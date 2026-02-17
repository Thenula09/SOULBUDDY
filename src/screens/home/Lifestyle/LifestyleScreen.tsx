import React from 'react';
import { View, Text, StyleSheet, ScrollView, Dimensions, Platform, TouchableOpacity, Animated } from 'react-native';
import { PieChart } from 'react-native-chart-kit';
import { useIsFocused } from '@react-navigation/native';
import LinearGradient from 'react-native-linear-gradient';

const MOCK_STATS = {
  moodScore: 7.4,
  sleepHours: 7.0,
  exerciseMins: 28,
  waterGlasses: 6,
};

const EMOTION_COLORS: { [key: string]: string } = {
  happy: '#4CAF50',
  sad: '#2196F3',
  angry: '#F44336',
  neutral: '#9E9E9E',
  fear: '#9C27B0',
  surprised: '#FF9800',
  disgust: '#795548',
};

import AsyncStorage from '@react-native-async-storage/async-storage';

const LifestyleScreen: React.FC = () => {
  const [todayMoods, setTodayMoods] = React.useState<any[]>([]);
  const [_lastMoods, setLastMoods] = React.useState<any[]>([]);
  const [pieData, setPieData] = React.useState<any[]>([]);
  const [lifestyleEntries, setLifestyleEntries] = React.useState<any[]>([]);
  const [weekSummary, setWeekSummary] = React.useState<any>({});
  const [_loading, setLoading] = React.useState<boolean>(true);
  const [isUnauth, setIsUnauth] = React.useState<boolean>(false);

  // screen & card entrance animations (trigger on tab focus)
  const isFocused = useIsFocused();
  const screenAnim = React.useRef(new Animated.Value(0)).current;
  const sectionAnims = React.useRef(Array.from({ length: 3 }, () => new Animated.Value(0))).current;

  React.useEffect(() => {
    if (isFocused) {
      screenAnim.setValue(0);
      sectionAnims.forEach(a => a.setValue(0));
      Animated.sequence([
        Animated.timing(screenAnim, { toValue: 1, duration: 300, useNativeDriver: true }),
        Animated.stagger(100, sectionAnims.map(a => Animated.timing(a, { toValue: 1, duration: 420, useNativeDriver: true }))),
      ]).start();
    } else {
      Animated.timing(screenAnim, { toValue: 0, duration: 200, useNativeDriver: true }).start();
      sectionAnims.forEach(a => a.setValue(0));
    }
  }, [isFocused, screenAnim, sectionAnims]);

  const screenAnimatedStyle = { opacity: screenAnim, transform: [{ translateY: screenAnim.interpolate({ inputRange: [0, 1], outputRange: [6, 0] }) }] };
  const sectionStyleFor = (i: number) => ({
    opacity: sectionAnims[i],
    transform: [
      { translateY: sectionAnims[i].interpolate({ inputRange: [0, 1], outputRange: [12, 0] }) },
      { scale: sectionAnims[i].interpolate({ inputRange: [0, 1], outputRange: [0.98, 1] }) },
    ],
  });

  // For local development: Android emulator -> direct lifestyle service (bypass gateway)
  const API_HOST = Platform.OS === 'android' ? 'http://10.0.2.2:8005' : 'http://10.190.154.90:8000';

  const fetchData = React.useCallback(async () => {
    try {
      const uid = await AsyncStorage.getItem('user_id');
      const accessToken = await AsyncStorage.getItem('access_token');
      
      // Guard clause - wait for authentication
      if (!uid || !accessToken) {
        console.log('No user_id or access_token yet, skipping fetch');
        setIsUnauth(true);
        setLoading(false);
        return;
      }

      const headers: any = { 'Content-Type': 'application/json' };
      headers.Authorization = `Bearer ${accessToken}`;

      const [todayRes, lastRes, entriesRes, weekRes, chartsRes] = await Promise.all([
        fetch(`${API_HOST}/api/lifestyle/moods/today/${uid}`, { headers }),
        fetch(`${API_HOST}/api/lifestyle/moods/last/${uid}?limit=7`, { headers }),
        fetch(`${API_HOST}/api/lifestyle/${uid}`, { headers }),
        fetch(`${API_HOST}/api/lifestyle/week/${uid}`, { headers }),
        fetch(`${API_HOST}/api/lifestyle/moods/combined-charts/${uid}`, { headers }),
      ]);

      const unauth = (todayRes.status === 401 || lastRes.status === 401 || entriesRes.status === 401 || weekRes.status === 401);
      setIsUnauth(unauth);
      if (unauth) console.warn('Unauthenticated when fetching lifestyle data — make sure user is logged in and access_token is set');

      let todayJson = todayRes.ok ? await todayRes.json() : { moods: [] };
      let lastJson = lastRes.ok ? await lastRes.json() : { moods: [] };
      let entriesJson = entriesRes.ok ? await entriesRes.json() : { entries: [] };
      let weekJson = weekRes.ok ? await weekRes.json() : {};

      // Try to read combined chart data (bar + pie) from backend
      let combinedChartsJson: any = null;
      if (chartsRes && chartsRes.ok) {
        try { combinedChartsJson = await chartsRes.json(); } catch { combinedChartsJson = null; }
      }

      // Dev fallback: if gateway is blocking (401) and we're in dev, try direct lifestyle-service (no auth)
      if (unauth && __DEV__) {
        try {
          // Use real data endpoints for development (reads from Supabase mood_history)
          const directToday = await fetch(`${API_HOST.replace(/:8000$/, ':8005')}/api/lifestyle/moods/today/${uid}`);
          const directLast = await fetch(`${API_HOST.replace(/:8000$/, ':8005')}/api/lifestyle/moods/last/${uid}?limit=8`);
          const directCharts = await fetch(`${API_HOST.replace(/:8000$/, ':8005')}/api/lifestyle/moods/combined-charts/${uid}`);
          
          if (directToday.ok) todayJson = await directToday.json();
          if (directLast.ok) lastJson = await directLast.json();
          
          if (directCharts.ok) {
            combinedChartsJson = await directCharts.json();
            // Use real pie data from combined-charts endpoint
            setPieData(combinedChartsJson.pie_data || []);
            console.info('Dev fallback: used real Supabase mood data');
          } else {
            // Fallback to demo if no real data available
            const demoFallback = await fetch(`${API_HOST.replace(/:8000$/, ':8005')}/api/demo/combined-charts/${uid}`);
            if (demoFallback.ok) {
              combinedChartsJson = await demoFallback.json();
              setPieData(combinedChartsJson.pie_data || []);
              console.info('Dev fallback: used demo data (no real mood data found)');
            }
          }
        } catch (err) {
          console.warn('Dev fallback failed:', err);
        }
      }

      const moodsToday = Array.isArray(todayJson.moods) ? todayJson.moods : [];
      const moodsLast = Array.isArray(lastJson.moods) ? lastJson.moods : [];
      const entries = Array.isArray(entriesJson.entries) ? entriesJson.entries : [];

      // Only show persisted DB entries in the UI (ignore in-memory fallback)
      const persistedEntries = (entriesJson.source === 'supabase' || entries.some((e: any) => e.id || e.created_at || e.createdAt)) ? entries : [];

      setTodayMoods(moodsToday);
      setLastMoods(moodsLast);
      setLifestyleEntries(persistedEntries);
      setWeekSummary(weekJson || {});

      // Build pie data from all moods (today + last)
      const allMoods = [...moodsToday, ...moodsLast];
      const counts: Record<string, number> = {}; 
      allMoods.forEach((m: any) => {
        const k = (m.emotion || 'Other');
        counts[k] = (counts[k] || 0) + 1;
      });

      const palette: Record<string, string> = {
        Happy: '#4CAF50',
        Sad: '#2196F3',
        Angry: '#F44336',
        Neutral: '#9E9E9E',
        Fear: '#9C27B0',
        Surprised: '#FF9800',
        Disgust: '#795548',
        Excited: '#FFEB3B',
        Other: '#FFB74D',
      };

      // Build pie data (either from combinedCharts if available, otherwise from local counts)
      const pie = (combinedChartsJson && combinedChartsJson.pie_data && combinedChartsJson.pie_data.length)
        ? combinedChartsJson.pie_data
        : Object.entries(counts).map(([name, population]) => ({
            name,
            population,
            color: palette[name] || '#ccc',
            legendFontColor: '#333',
            legendFontSize: 12,
          }));

      setPieData(pie);

      // 7-day bar chart removed from UI — pie and timeline still provided by backend (no local bar state needed).

    } catch (e) {
      console.error('Failed to fetch lifestyle data', e);
    } finally {
      setLoading(false);
    }
  }, [API_HOST]);

  React.useEffect(() => { fetchData(); }, [fetchData]);

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <Animated.View style={screenAnimatedStyle}>
        <View style={styles.titleContainer}>
          <Text style={styles.title}>Lifestyle & Well‑being</Text>
          <Text style={styles.subtitle}>Track your mood, sleep and activity — small wins add up</Text>
        </View> 

      <Animated.View style={sectionStyleFor(0)}>
        <LinearGradient colors={[ 'rgba(0,122,255,0.06)', 'rgba(255,255,255,0.45)' ]} style={[styles.sectionCard, styles.statsCard]}>
          <View style={styles.cardHeader}>
            <View style={styles.cardHeaderLeft}>
              <Text style={styles.sectionIcon}>📊</Text>
              <Text style={styles.sectionTitle}>Weekly summary</Text>
            </View>
            <Text style={styles.cardAction}>Last 7d</Text>
          </View>

          <View style={styles.statsRow}>
            <View style={styles.statCard}>
              <Text style={styles.statLabel}>Avg. Mood</Text>
              <Text style={styles.statValue}>{MOCK_STATS.moodScore.toFixed(1)}</Text>
            </View>
            <View style={styles.statCard}>
              <Text style={styles.statLabel}>Sleep (hrs)</Text>
              <Text style={styles.statValue}>{weekSummary?.avg_sleep ?? MOCK_STATS.sleepHours}</Text>
            </View>
            <View style={styles.statCard}>
              <Text style={styles.statLabel}>Exercise (min)</Text>
              <Text style={styles.statValue}>{weekSummary?.avg_exercise_mins ?? MOCK_STATS.exerciseMins}</Text>
            </View>
          </View>
        </LinearGradient>
      </Animated.View>

      {/* Pie chart (from backend moods today) */}
      <Animated.View style={sectionStyleFor(1)}>
        <LinearGradient colors={[ 'rgba(0,122,255,0.06)', 'rgba(255,255,255,0.45)' ]} style={styles.sectionCard}>
          <View style={styles.cardHeader}>
            <View style={styles.cardHeaderLeft}>
              <Text style={styles.sectionIcon}>😊</Text>
              <Text style={styles.sectionTitle}>Mood Distribution (today)</Text>
            </View>
            <TouchableOpacity onPress={() => {}}>
              <Text style={styles.cardAction}>Details</Text>
            </TouchableOpacity>
          </View>
          <PieChart
            data={pieData.length ? pieData : [{ name: 'No data', population: 1, color: '#eee', legendFontColor: '#333', legendFontSize: 12 }]}
            width={Math.max(Dimensions.get('window').width - 48, 240)}
            height={160}
            accessor="population"
            backgroundColor="transparent"
            paddingLeft="15"
            absolute
            chartConfig={{ color: (opacity = 1) => `rgba(0,0,0,${opacity})`, strokeWidth: 2 }}
          />
        </LinearGradient>
      </Animated.View>



      <Animated.View style={sectionStyleFor(2)}>
        <LinearGradient colors={[ 'rgba(0,122,255,0.06)', 'rgba(255,255,255,0.45)' ]} style={styles.sectionCard}>
          <View style={styles.cardHeader}>
            <View style={styles.cardHeaderLeft}>
              <Text style={styles.sectionIcon}>⏱️</Text>
              <Text style={styles.sectionTitle}>Today — Timeline</Text>
            </View>
            <TouchableOpacity onPress={() => {}}>
              <Text style={styles.cardAction}>Expand</Text>
            </TouchableOpacity>
          </View>
          <View style={styles.timelineRow}>
            {todayMoods.length > 0 ? (
              todayMoods.map((m, i) => (
                <View key={i} style={styles.timelineItem}>
                  <View style={[styles.bar, { height: 20 + (i % 4) * 12, backgroundColor: EMOTION_COLORS[(m.emotion || '').toLowerCase()] || '#ccc' }]} />
                  <Text style={styles.time}>{new Date(m.ts).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</Text>
                </View>
              ))
            ) : (
              <Text style={styles.emptyText}>No mood entries for today.</Text>
            )}
          </View>
        </LinearGradient>
      </Animated.View>






    </Animated.View>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: { padding: 20, paddingBottom: 40, backgroundColor: '#f5f7fa' },
  titleContainer: { marginBottom: 16, paddingHorizontal: 4, alignItems: 'center' },
  title: { fontSize: 26, fontWeight: '800', color: '#2011F9', marginBottom: 6, textAlign: 'center' },
  subtitle: { fontSize: 13, color: '#60708A', textAlign: 'center', maxWidth: 560 },
  statsRow: { flexDirection: 'row', justifyContent: 'space-around', marginBottom: 18, width: '100%' },
  statCard: { flex: 1, padding: 14, marginHorizontal: 6, backgroundColor: '#fff', borderRadius: 12, alignItems: 'center', shadowColor: '#000', shadowOpacity: 0.06, shadowOffset: { width: 0, height: 3 }, shadowRadius: 8, elevation: 3, borderWidth: 1, borderColor: '#EEF2F6' },
  statLabel: { fontSize: 12, color: '#94A3B8' },
  statValue: { fontSize: 22, fontWeight: '800', color: '#0F172A', marginTop: 6 },
  card: { backgroundColor: '#fff', borderRadius: 14, padding: 14, marginBottom: 12, shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 10, elevation: 3 },
  /* card header */
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
  cardHeaderLeft: { flexDirection: 'row', alignItems: 'center' },
  cardHeaderIcon: { fontSize: 18, marginRight: 10, color: '#2011F9' },
  cardAction: { fontSize: 12, color: '#2011F9', fontWeight: '600' },
  sectionCard: {
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    overflow: 'hidden',
    backgroundColor: 'rgba(0, 13, 255, 0.28)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.12)',
    shadowColor: '#ffffff',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.06,
    shadowRadius: 18,
    elevation: 6,
    // subtle inner highlight to enhance glass effect
    borderStyle: 'solid',
  },
  sectionTitle: { fontSize: 16, fontWeight: '600', color: '#0400ff', marginBottom: 8 },
  sectionIcon: { fontSize: 16, marginRight: 8, color: '#2011F9' },
  /* tuned card title */
  cardTitle: { fontSize: 16, fontWeight: '700', marginBottom: 8, textAlign: 'left', color: '#0F172A' },
  timelineRow: { flexDirection: 'row', alignItems: 'flex-end', justifyContent: 'space-between' },
  statsCard: { paddingVertical: 6 },
  timelineItem: { alignItems: 'center', width: 36, marginHorizontal: 4 },
  bar: { width: 18, backgroundColor: '#4CAF50', borderRadius: 4 },
  time: { fontSize: 9, color: '#777', marginTop: 6 },

  note: { marginTop: 8, fontSize: 12, color: '#666' },
  emptyText: { color: '#888', fontSize: 12, textAlign: 'center', paddingVertical: 12 },
  emptyTextError: { color: '#c0392b' },
  entryRow: { paddingVertical: 8, borderBottomColor: '#eee' },
  entryRowBorder: { borderBottomWidth: 1 },
  entryTimestamp: { fontSize: 12, color: '#666' },
  entryTitle: { fontWeight: '600', marginTop: 4 },
  entryNotes: { color: '#666', marginTop: 4 },
});

export default LifestyleScreen;
