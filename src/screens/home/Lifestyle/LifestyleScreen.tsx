import React from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Dimensions, Platform } from 'react-native';
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
  const [lastMoods, setLastMoods] = React.useState<any[]>([]);
  const [pieData, setPieData] = React.useState<any[]>([]);
  const [lifestyleEntries, setLifestyleEntries] = React.useState<any[]>([]);
  const [weekSummary, setWeekSummary] = React.useState<any>({});
  const [loading, setLoading] = React.useState<boolean>(true);
  const [isUnauth, setIsUnauth] = React.useState<boolean>(false);

  const API_HOST = Platform.OS === 'android' ? 'http://10.0.2.2:8000' : 'http://10.190.154.90:8000';

  const fetchData = async () => {
    setLoading(true);
    try {
      const uid = await AsyncStorage.getItem('user_id') || '1';

      const accessToken = await AsyncStorage.getItem('access_token');
      const headers: any = { 'Content-Type': 'application/json' };
      if (accessToken) headers['Authorization'] = `Bearer ${accessToken}`;

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
  };

  React.useEffect(() => { fetchData(); }, []);

  const onQuickAction = async (type: 'sleep'|'exercise'|'hydration') => {
    try {
      const uid = await AsyncStorage.getItem('user_id') || '1';
      const body: any = { user_id: Number(uid) };
      if (type === 'sleep') body.sleep_hours = 7;
      if (type === 'exercise') body.exercise_minutes = 20;
      if (type === 'hydration') body.water_glasses = 1;

      const res = await fetch(`${API_HOST}/api/lifestyle/log`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
      const json = res.ok ? await res.json() : { ok: false };

      // If entry was only stored in-memory (dev fallback), inform via console and do not surface it in the persisted list
      if (json.source && json.source !== 'supabase') {
        console.warn('Lifestyle entry saved to memory only (not persisted to DB)');
      }

      await fetchData();
    } catch (e) { console.error(e); }
  };

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <Text style={styles.header}>Lifestyle</Text>

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
        <Text style={styles.cardTitle}>Quick Actions</Text>
        <View style={styles.actionsRow}>
          <TouchableOpacity onPress={() => onQuickAction('sleep')} style={styles.actionBtn}><Text style={styles.actionText}>Log Sleep</Text></TouchableOpacity>
          <TouchableOpacity onPress={() => onQuickAction('exercise')} style={styles.actionBtn}><Text style={styles.actionText}>Log Exercise</Text></TouchableOpacity>
          <TouchableOpacity onPress={() => onQuickAction('hydration')} style={styles.actionBtn}><Text style={styles.actionText}>Hydration</Text></TouchableOpacity>
        </View>
        <Text style={styles.note}>Data shown below is read from central DB (mood history) and local lifestyle entries.</Text>
      </View>

      <View style={styles.card}>
        <Text style={styles.cardTitle}>Recent lifestyle entries</Text>
        {isUnauth ? (
          <Text style={[styles.emptyText, { color: '#c0392b' }]}>Please log in to view persisted lifestyle entries.</Text>
        ) : lifestyleEntries && lifestyleEntries.length > 0 ? (
          lifestyleEntries.map((e: any, i: number) => (
            <View key={i} style={{ paddingVertical: 8, borderBottomWidth: i < lifestyleEntries.length - 1 ? 1 : 0, borderBottomColor: '#eee' }}>
              <Text style={{ fontSize: 12, color: '#666' }}>{new Date(e.ts || e.created_at || e.time).toLocaleString()}</Text>
              <Text style={{ fontWeight: '600', marginTop: 4 }}>{e.sleep_hours ? `Sleep: ${e.sleep_hours} hrs` : ''}{e.exercise_minutes ? ` • Exercise: ${e.exercise_minutes} min` : ''}{e.water_glasses ? ` • Water: ${e.water_glasses}` : ''}</Text>
              {e.notes ? <Text style={{ color: '#666', marginTop: 4 }}>{e.notes}</Text> : null}
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
  container: { padding: 16, paddingBottom: 40, backgroundColor: '#fff' },
  header: { fontSize: 20, fontWeight: '700', marginBottom: 12, color: '#222' },
  statsRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 16 },
  statCard: { flex: 1, padding: 12, marginHorizontal: 6, backgroundColor: '#f6f9ff', borderRadius: 10, alignItems: 'center' },
  statLabel: { fontSize: 12, color: '#666' },
  statValue: { fontSize: 20, fontWeight: '700', color: '#111', marginTop: 6 },
  card: { backgroundColor: '#fff', borderRadius: 12, padding: 12, marginBottom: 12, shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 6, elevation: 2 },
  cardTitle: { fontSize: 14, fontWeight: '600', marginBottom: 8 },
  timelineRow: { flexDirection: 'row', alignItems: 'flex-end', justifyContent: 'space-between' },
  timelineItem: { alignItems: 'center', width: 36, marginHorizontal: 4 },
  bar: { width: 18, backgroundColor: '#4CAF50', borderRadius: 4 },
  time: { fontSize: 9, color: '#777', marginTop: 6 },
  actionsRow: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 8 },
  actionBtn: { flex: 1, marginHorizontal: 6, paddingVertical: 10, borderRadius: 8, backgroundColor: '#007AFF', alignItems: 'center' },
  actionText: { color: '#fff', fontWeight: '600' },
  note: { marginTop: 8, fontSize: 12, color: '#666' },
  emptyText: { color: '#888', fontSize: 12, textAlign: 'center', paddingVertical: 12 },
});

export default LifestyleScreen;
