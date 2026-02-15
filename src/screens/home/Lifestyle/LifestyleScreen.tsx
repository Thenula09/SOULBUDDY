import React from 'react';
import { View, Text, StyleSheet, ScrollView, Dimensions, Platform } from 'react-native';
import { PieChart } from 'react-native-chart-kit';

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

  const API_HOST = Platform.OS === 'android' ? 'http://10.0.2.2:8000' : 'http://10.190.154.90:8000';

  const fetchData = React.useCallback(async () => {
    setLoading(true);
    try {
      const uid = await AsyncStorage.getItem('user_id') || '1';

      const accessToken = await AsyncStorage.getItem('access_token');
      const headers: any = { 'Content-Type': 'application/json' };
      if (accessToken) headers.Authorization = `Bearer ${accessToken}`;

      const [todayRes, lastRes, entriesRes, weekRes] = await Promise.all([
        fetch(`${API_HOST}/api/lifestyle/moods/today/${uid}`, { headers }),
        fetch(`${API_HOST}/api/lifestyle/moods/last/${uid}?limit=7`, { headers }),
        fetch(`${API_HOST}/api/lifestyle/${uid}`, { headers }),
        fetch(`${API_HOST}/api/lifestyle/week/${uid}`, { headers }),
      ]);

      const unauth = (todayRes.status === 401 || lastRes.status === 401 || entriesRes.status === 401 || weekRes.status === 401);
      setIsUnauth(unauth);
      if (unauth) console.warn('Unauthenticated when fetching lifestyle data — make sure user is logged in and access_token is set');

      let todayJson = todayRes.ok ? await todayRes.json() : { moods: [] };
      let lastJson = lastRes.ok ? await lastRes.json() : { moods: [] };
      let entriesJson = entriesRes.ok ? await entriesRes.json() : { entries: [] };
      let weekJson = weekRes.ok ? await weekRes.json() : {};

      // Dev fallback: if gateway is blocking (401) and we're in dev, try direct lifestyle-service (no auth)
      if (unauth && __DEV__) {
        try {
          const directToday = await fetch(`${API_HOST.replace(/:8000$/, ':8005')}/api/lifestyle/moods/today/${uid}`);
          const directEntries = await fetch(`${API_HOST.replace(/:8000$/, ':8005')}/api/lifestyle/${uid}`);
          const directWeek = await fetch(`${API_HOST.replace(/:8000$/, ':8005')}/api/lifestyle/week/${uid}`);
          if (directToday.ok) todayJson = await directToday.json();
          if (directEntries.ok) entriesJson = await directEntries.json();
          if (directWeek.ok) weekJson = await directWeek.json();
          console.info('Dev fallback: used direct lifestyle-service requests');
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



      // build pie data from today's moods
      const counts: Record<string, number> = {}; 
      moodsToday.forEach((m: any) => {
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
        Other: '#FFB74D',
      };

      const pie = Object.entries(counts).map(([name, population]) => ({
        name,
        population,
        color: palette[name] || '#ccc',
        legendFontColor: '#333',
        legendFontSize: 12,
      }));

      setPieData(pie);

    } catch (e) {
      console.error('Failed to fetch lifestyle data', e);
    } finally {
      setLoading(false);
    }
  }, [API_HOST]);

  React.useEffect(() => { fetchData(); }, [fetchData]);

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <View style={styles.titleContainer}>
        <Text style={styles.title}>Lifestyle & Well‑being</Text>
        <Text style={styles.subtitle}>Track your mood, sleep and activity — small wins add up</Text>
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

      {/* Pie chart (from backend moods today) */}
      <View style={styles.card}>
        <Text style={styles.cardTitle}>Mood Distribution (today)</Text>
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
      </View>

      <View style={styles.card}>
        <Text style={styles.cardTitle}>Today — Timeline</Text>
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
      </View>





      <View style={styles.card}>
        <Text style={styles.cardTitle}>Recent lifestyle entries</Text>
        {isUnauth ? (
          <Text style={[styles.emptyText, styles.emptyTextError]}>Please log in to view persisted lifestyle entries.</Text>
        ) : lifestyleEntries && lifestyleEntries.length > 0 ? (
          lifestyleEntries.map((e: any, i: number) => (
            <View key={i} style={[styles.entryRow, i < lifestyleEntries.length - 1 && styles.entryRowBorder]}>
              <Text style={styles.entryTimestamp}>{new Date(e.ts || e.created_at || e.time).toLocaleString()}</Text>
              <Text style={styles.entryTitle}>{e.sleep_hours ? `Sleep: ${e.sleep_hours} hrs` : ''}{e.exercise_minutes ? ` • Exercise: ${e.exercise_minutes} min` : ''}{e.water_glasses ? ` • Water: ${e.water_glasses}` : ''}</Text>
              {e.notes ? <Text style={styles.entryNotes}>{e.notes}</Text> : null}
            </View>
          ))
        ) : (
          <Text style={styles.emptyText}>No lifestyle entries yet.</Text>
        )}
      </View>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: { padding: 20, paddingBottom: 40, backgroundColor: '#F4F6FB' },
  titleContainer: { marginBottom: 12, paddingHorizontal: 4 },
  title: { fontSize: 24, fontWeight: '800', color: '#0F172A', marginBottom: 4 },
  subtitle: { fontSize: 13, color: '#60708A' },
  statsRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 16 },
  statCard: { flex: 1, padding: 14, marginHorizontal: 6, backgroundColor: '#fff', borderRadius: 12, alignItems: 'center', shadowColor: '#000', shadowOpacity: 0.06, shadowOffset: { width: 0, height: 3 }, shadowRadius: 8, elevation: 3, borderWidth: 1, borderColor: '#EEF2F6' },
  statLabel: { fontSize: 12, color: '#94A3B8' },
  statValue: { fontSize: 22, fontWeight: '800', color: '#0F172A', marginTop: 6 },
  card: { backgroundColor: '#fff', borderRadius: 14, padding: 14, marginBottom: 12, shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 10, elevation: 3 },
  cardTitle: { fontSize: 14, fontWeight: '600', marginBottom: 8 },
  timelineRow: { flexDirection: 'row', alignItems: 'flex-end', justifyContent: 'space-between' },
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
