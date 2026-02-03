import React, { useEffect, useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Alert, ActivityIndicator, Image } from 'react-native';
import { FlashList } from '@shopify/flash-list';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { AuthScreenProps } from '../../../types/navigation';

const API = 'http://10.0.2.2:8004/admin/online-users';
const ADMIN_PASSWORD = '123456';

type OnlineUser = {
  user_id: string;
  email?: string;
  full_name?: string;
  profile_photo_url?: string;
  last_activity?: string;
};

const AdminHome: React.FC<AuthScreenProps> = ({ navigation }) => {
  const [loading, setLoading] = useState(false);
  const [users, setUsers] = useState<OnlineUser[]>([]);

  useEffect(() => {
    const checkAdmin = async () => {
      try {
        const v = await AsyncStorage.getItem('is_admin');
        if (v !== 'true') {
          navigation.navigate('AdminLogin');
        } else {
          fetchOnlineUsers();
        }
      } catch (e) {
        console.warn('Failed to check admin flag', e);
      }
    };
    checkAdmin();
  }, [navigation]);

  const fetchOnlineUsers = async () => {
    setLoading(true);
    try {
      const resp = await fetch(`${API}?minutes=5`, {
        headers: { 'X-Admin-Password': ADMIN_PASSWORD },
      });
      if (!resp.ok) throw new Error('Failed to fetch online users');
      const data = await resp.json();
      setUsers(data || []);
    } catch (e) {
      console.error('Error fetching online users', e);
      Alert.alert('Error', 'Could not load online users');
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = async () => {
    try {
      await AsyncStorage.removeItem('is_admin');
      Alert.alert('Logged out', 'You have been logged out from admin');
      navigation.navigate('Login');
    } catch (e) {
      console.warn('Error logging out', e);
    }
  };

  const renderUser = ({ item }: { item: OnlineUser }) => (
    <View style={styles.userRow}>
      {item.profile_photo_url ? (
        <Image source={{ uri: item.profile_photo_url }} style={styles.avatar} />
      ) : (
        <View style={[styles.avatar, styles.avatarPlaceholder]} />
      )}
      <View style={styles.userInfo}>
        <Text style={styles.userName}>{item.full_name || item.email || item.user_id}</Text>
        <Text style={styles.userMeta}>{item.email}</Text>
      </View>
      <View style={styles.onlineDot} />
      <Text style={styles.lastActivity}>{item.last_activity ? new Date(item.last_activity).toLocaleTimeString() : ''}</Text>
    </View>
  );

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Admin Home</Text>
      <Text style={styles.subtitle}>Welcome, Admin 👋</Text>

      <View style={styles.card}>
        <Text style={styles.cardTitle}>Online users (last 5 minutes)</Text>

        {loading ? (
          <ActivityIndicator style={styles.loadingIndicator} />
        ) : users.length === 0 ? (
          <Text style={styles.emptyText}>No users online in the last 5 minutes.</Text>
        ) : (
          <View style={styles.listContainer}>
            <FlashList 
              data={users} 
              keyExtractor={(i) => i.user_id} 
              renderItem={renderUser}
            />
          </View>
        )}

        <View style={styles.buttonRow}>
          <TouchableOpacity style={[styles.button, styles.buttonMargin]} onPress={fetchOnlineUsers}>
            <Text style={styles.buttonText}>Refresh</Text>
          </TouchableOpacity>
          <TouchableOpacity style={[styles.button, styles.buttonOrange]} onPress={() => Alert.alert('TODO', 'Open user management') }>
            <Text style={styles.buttonText}>Manage Users</Text>
          </TouchableOpacity>
        </View>
      </View>

      <TouchableOpacity style={styles.logoutButton} onPress={handleLogout}>
        <Text style={styles.logoutText}>Log out</Text>
      </TouchableOpacity>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, padding: 20, alignItems: 'center', backgroundColor: '#fff' },
  title: { fontSize: 26, fontWeight: '700', marginTop: 40 },
  subtitle: { fontSize: 14, color: '#666', marginBottom: 20 },
  card: { width: '100%', backgroundColor: '#f7f7f7', padding: 16, borderRadius: 10, marginTop: 16 },
  cardTitle: { fontSize: 16, fontWeight: '600', marginBottom: 6 },
  cardText: { color: '#444' },
  logoutButton: { marginTop: 32, backgroundColor: '#F44336', paddingVertical: 10, paddingHorizontal: 20, borderRadius: 8 },
  logoutText: { color: '#fff', fontWeight: '600' },

  // Online users styles
  userRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: '#eee' },
  avatar: { width: 44, height: 44, borderRadius: 22, marginRight: 12 },
  avatarPlaceholder: { backgroundColor: '#ddd' },
  userInfo: { flex: 1 },
  userName: { fontWeight: '600' },
  userMeta: { color: '#666', fontSize: 12 },
  onlineDot: { width: 10, height: 10, borderRadius: 5, backgroundColor: '#4CAF50', marginRight: 8 },
  lastActivity: { fontSize: 12, color: '#666' },
  
  // Loading and empty states
  loadingIndicator: { marginTop: 12 },
  emptyText: { color: '#666', marginTop: 12 },
  listContainer: { height: 300 },
  
  // Button styles
  buttonRow: { flexDirection: 'row', marginTop: 12 },
  button: { flex: 1, backgroundColor: '#007AFF', padding: 12, borderRadius: 8, alignItems: 'center' },
  buttonMargin: { marginRight: 8 },
  buttonOrange: { backgroundColor: '#FF9500' },
  buttonText: { color: '#fff', fontWeight: '600' },
});

export default AdminHome;