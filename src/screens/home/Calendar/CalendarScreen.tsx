import React, { useMemo, useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Modal,
  TextInput,
  ScrollView,
  Alert,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { API_ENDPOINTS, fetchWithTimeout } from '../../../config/api';

const monthNames = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December'
];

const formatKey = (y: number, m: number, d: number) => `${y}-${String(m + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;

const CalendarScreen: React.FC = () => {
  const today = new Date();
  const [month, setMonth] = useState<number>(today.getMonth()); // 0-based
  const [year, setYear] = useState<number>(today.getFullYear());
  const [selectedDay, setSelectedDay] = useState<number>(today.getDate());
  const [events, setEvents] = useState<Record<string, string[]>>({});
  const [modalVisible, setModalVisible] = useState(false);
  const [newEventText, setNewEventText] = useState('');

  // Persisted storage key
  const STORAGE_KEY = 'calendar_events_v1';

  // Load persisted events on mount
  useEffect(() => {
    (async () => {
      try {
        const raw = await AsyncStorage.getItem(STORAGE_KEY);
        if (raw) setEvents(JSON.parse(raw));

        // try to fetch from backend if we have a logged-in user
        const uid = await AsyncStorage.getItem('user_id');
        if (uid) {
          try {
            const res = await fetchWithTimeout(API_ENDPOINTS.EVENTS_BY_USER(Number(uid)), {}, 5000);
            if (res.ok) {
              const list = await res.json();
              const map: Record<string, string[]> = {};
              list.forEach((ev: any) => {
                const k = ev.date;
                if (!map[k]) map[k] = [];
                map[k].push(ev.title);
              });
              setEvents(map);
              await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(map));
            }
          } catch {
            // ignore, keep local cache
          }
        }
      } catch (err) {
        console.warn('Failed to load calendar events', err);
      }
    })();
  }, []);

  const daysInMonth = useMemo(() => new Date(year, month + 1, 0).getDate(), [month, year]);
  const firstDayIndex = useMemo(() => new Date(year, month, 1).getDay(), [month, year]);

  const selectedKey = formatKey(year, month, selectedDay);
  const eventsForSelected = events[selectedKey] ?? [];

  const changeMonth = (dir: number) => {
    let m = month + dir;
    let y = year;
    if (m < 0) { m = 11; y -= 1; }
    if (m > 11) { m = 0; y += 1; }
    setMonth(m);
    setYear(y);
    setSelectedDay(1);
  };

  const handleDatePress = (day: number) => {
    setSelectedDay(day);
  };

  const handleAddEvent = async () => {
    if (!newEventText.trim()) {
      Alert.alert('Please enter an event title');
      return;
    }

    const key = formatKey(year, month, selectedDay);
    const title = newEventText.trim();

    // Try server first if user is logged in
    const uid = await AsyncStorage.getItem('user_id');
    if (uid) {
      try {
        const payload = { user_id: Number(uid), date: key, title };
        const res = await fetchWithTimeout(API_ENDPOINTS.EVENTS, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) }, 5000);
        if (res.ok) {
          const ev = await res.json();
          setEvents(prev => {
            const list = prev[key] ? [...prev[key], ev.title] : [ev.title];
            const next = { ...prev, [key]: list };
            AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(next)).catch(() => {});
            return next;
          });
          setNewEventText('');
          setModalVisible(false);
          return;
        }
      } catch (err) {
        console.warn('Failed to save event to server, falling back to local cache', err);
      }
    }

    // Fallback: local-only
    setEvents(prev => {
      const list = prev[key] ? [...prev[key], title] : [title];
      const next = { ...prev, [key]: list };
      AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(next)).catch(err => console.warn('Failed to save event', err));
      return next;
    });

    setNewEventText('');
    setModalVisible(false);
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => changeMonth(-1)} style={styles.navBtn}><Text style={styles.navTxt}>‹</Text></TouchableOpacity>
        <View style={styles.headerCenter}>
          <Text style={styles.headerEmoji}>📅</Text>
          <Text style={styles.headerTitle}>{monthNames[month]} {year}</Text>
        </View>
        <TouchableOpacity onPress={() => changeMonth(1)} style={styles.navBtn}><Text style={styles.navTxt}>›</Text></TouchableOpacity>
      </View>

      <View style={styles.weekdaysRow}>
        {['Sun ☀️','Mon 🌙','Tue 🔥','Wed 🌤️','Thu ⚡','Fri 🎉','Sat 🌈'].map(w => (
          <Text key={w} style={styles.weekday}>{w}</Text>
        ))}
      </View>

      <ScrollView style={styles.calendarWrap} contentContainerStyle={styles.calendarContent}>
        {/* empty slots for first week */}
        {Array.from({ length: firstDayIndex }).map((_, i) => (
          <View key={`empty-${i}`} style={styles.dayCell} />
        ))}

        {Array.from({ length: daysInMonth }).map((_, i) => {
          const day = i + 1;
          const key = formatKey(year, month, day);
          const hasEvents = !!events[key]?.length;
          const selected = day === selectedDay;
          const isToday = today.getFullYear() === year && today.getMonth() === month && today.getDate() === day;

          return (
            <TouchableOpacity
              key={key}
              style={[styles.dayCell, selected && styles.dayCellSelected, isToday && styles.dayCellToday]}
              onPress={() => handleDatePress(day)}
            >
              <View style={styles.dayTopRow}>
                <Text style={[styles.dayText, selected && styles.dayTextSelected]}>{day}</Text>
                {isToday && (
                  <View style={styles.todayBadge}><Text style={styles.todayBadgeText}>✨</Text></View>
                )}
              </View>

              {hasEvents ? (
                <Text style={styles.eventEmoji}>📌</Text>
              ) : (
                <View style={styles.daySpacer} />
              )}
            </TouchableOpacity>
          );
        })} 

      </ScrollView>

      <View style={styles.eventsPanel}>
        <Text style={styles.eventsTitle}>📍 Events for {selectedKey}</Text>
        {eventsForSelected.length === 0 ? (
          <Text style={styles.noEvents}>😴 No events yet — add one.</Text>
        ) : (
          eventsForSelected.map((ev, idx) => (
            <View key={idx} style={styles.eventCard}>
              <Text style={styles.eventEmojiItem}>📅</Text>
              <Text style={styles.eventText}>{ev}</Text>
            </View>
          ))
        )} 

        <View style={styles.actionsRow}>
          <TouchableOpacity style={styles.addBtn} onPress={() => setModalVisible(true)}>
            <Text style={styles.addBtnText}>+ Add event</Text>
          </TouchableOpacity>
        </View>
      </View>

      <Modal visible={modalVisible} animationType="slide" transparent>
        <View style={styles.modalBackdrop}>
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>Add event for {selectedKey}</Text>
            <TextInput
              value={newEventText}
              onChangeText={setNewEventText}
              placeholder="Event title"
              style={styles.input}
              placeholderTextColor="#b7cef3"
            />
            <View style={styles.modalActions}>
              <TouchableOpacity style={styles.modalButton} onPress={() => setModalVisible(false)}>
                <Text style={styles.modalButtonText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[styles.modalButton, styles.modalPrimary]} onPress={handleAddEvent}>
                <Text style={[styles.modalButtonText, styles.modalPrimaryText]}>Add</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F7F8FB', padding: 16 },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
  headerTitle: { fontSize: 18, fontWeight: '700', color: '#2011F9' },
  headerCenter: { alignItems: 'center' },
  navBtn: { padding: 8 },
  navTxt: { fontSize: 20, color: '#000000' },
  weekdaysRow: { flexDirection: 'row', justifyContent: 'space-between', paddingHorizontal: 4, marginBottom: 8 },
  weekday: { width: `${100 / 7}%`, textAlign: 'center', color: '#666', fontWeight: '600' },
  /* reduce calendar height so events panel sits higher */
  calendarWrap: { flex: 0.68, marginBottom: 6 },
  calendarContent: { flexDirection: 'row', flexWrap: 'wrap' },
  dayCell: { width: `${100 / 7}%`, alignItems: 'center', paddingVertical: 8, borderRadius: 8 },
  dayCellSelected: { backgroundColor: '#2011F9' },
  dayText: { color: '#333' },
  dayTextSelected: { color: '#ffffff', fontWeight: '700' },
  dot: { width: 6, height: 6, borderRadius: 3, backgroundColor: '#FF6B6B', marginTop: 6 },
  /* pull events panel up slightly and add subtle card background */
  eventsPanel: { paddingVertical: 12, borderTopWidth: 1, borderTopColor: '#EEE', marginTop: -18, backgroundColor: 'transparent' },
  eventsTitle: { fontWeight: '700', color: '#222', marginBottom: 8 },
  noEvents: { color: '#000000' },
  eventRow: { paddingVertical: 6 },
  eventText: { color: '#000000' },
  actionsRow: { flexDirection: 'row', justifyContent: 'flex-end', marginTop: 8 },
  addBtn: { backgroundColor: '#2011F9', paddingHorizontal: 14, paddingVertical: 10, borderRadius: 8 },
  addBtnText: { color: '#fff', fontWeight: '700' },
  modalBackdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.35)', justifyContent: 'center', padding: 20 },
  modalCard: { backgroundColor: '#fff', borderRadius: 12, padding: 16 },
  modalTitle: { fontSize: 16, fontWeight: '700', marginBottom: 8 },
  input: { borderWidth: 1, borderColor: '#EEE', borderRadius: 8, padding: 10, marginBottom: 12, color: '#222' },
  modalActions: { flexDirection: 'row', justifyContent: 'flex-end' },
  modalButton: { paddingVertical: 10, paddingHorizontal: 14, borderRadius: 8, marginLeft: 8 },
  modalButtonText: { color: '#333', fontWeight: '600' },
  modalPrimary: { backgroundColor: '#2011F9' },
  modalPrimaryText: { color: '#fff' },

  /* Visual improvements & emojis */
  headerEmoji: { fontSize: 20, marginBottom: 4 },
  dayTopRow: { flexDirection: 'row', alignItems: 'center' },
  dayCellToday: { borderColor: '#FFB74D', borderWidth: 1, backgroundColor: '#FFF8E1', borderRadius: 8 },
  todayBadge: { backgroundColor: '#FFE082', paddingHorizontal: 6, paddingVertical: 2, borderRadius: 12, marginLeft: 6 },
  todayBadgeText: { fontSize: 10 },
  eventEmoji: { marginTop: 6, fontSize: 14 },
  daySpacer: { height: 12 },
  eventCard: { flexDirection: 'row', alignItems: 'center', paddingVertical: 8, paddingHorizontal: 10, backgroundColor: '#fff', borderRadius: 10, marginBottom: 8, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 6, elevation: 2 },
  eventEmojiItem: { marginRight: 10, fontSize: 18 },
});

export default CalendarScreen;
