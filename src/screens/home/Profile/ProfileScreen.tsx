import React, { useEffect, useState, useCallback } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  Image,
  StyleSheet,
  Alert,
  InteractionManager,
} from 'react-native';
import { launchImageLibrary } from 'react-native-image-picker';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Picker } from '@react-native-picker/picker';
import { ProfileSkeleton } from '../../../components/ScreenSkeletons';
import HealthSelection from '../../../components/HealthSelection';

const HOBBIES = [
  'Reading',
  'Traveling',
  'Cooking',
  'Gaming',
  'Photography',
  'Gardening',
  'Painting',
  'Writing',
  'Music',
  'Dancing',
];

type Profile = {
  user_id: string | null;
  full_name: string;
  hobbies: string;
  family_members: number; // store as number
  ambitions: string[];
  job_title: string;
  is_student: boolean;
  is_married: boolean;
  relationship_status: string;
  health_conditions: string[];
  favorite_songs: string[];
  province: string;
  village: string;
  profile_photo_url?: string;
  lifestyle?: {
    sleep?: number; // hours
    exercise?: number; // minutes
    diet?: string; // good/okay/poor
    [key: string]: any;
  };
};

const defaultProfile: Profile = {
  user_id: null,
  full_name: '',
  hobbies: 'Music',
  family_members: 0,
  ambitions: [],
  job_title: '',
  is_student: false,
  is_married: false,
  relationship_status: 'single',
  health_conditions: [],
  favorite_songs: [],
  province: '',
  village: '',
  profile_photo_url: undefined,
  lifestyle: { sleep: 7, exercise: 30, diet: 'good' },
};

const ProfileScreen = React.memo(() => {
  const [loading, setLoading] = useState(true);
  const [userId, setUserId] = useState<string | null>(null);
  const [newAmbition, setNewAmbition] = useState('');
  const [newSong, setNewSong] = useState('');
  const [profile, setProfile] = useState<Profile>(defaultProfile);

  useEffect(() => {
    // Defer loading until after navigation animation
    const task = InteractionManager.runAfterInteractions(() => {
      const load = async () => {
        const uid = await AsyncStorage.getItem('user_id');
        setUserId(uid);
        if (uid) await getProfile(uid);
      };
      load();
    });

    return () => task.cancel();
  }, []);

  const getProfile = useCallback(async (uid: string) => {
    try {
      // Check cache first (10 min TTL for profile)
      const cached = await AsyncStorage.getItem('cached_profile_data');
      const cacheTime = await AsyncStorage.getItem('profile_cache_time');
      const cacheTimestamp = Date.now();
      
      if (cached && cacheTime && (cacheTimestamp - parseInt(cacheTime, 10)) < 600000) {
        const profileData = JSON.parse(cached);
        setProfile({ ...defaultProfile, ...profileData });
        setLoading(false);
        return;
      }
      
      setLoading(true);

      // Prefer authenticated endpoint that uses Authorization token
      const accessToken = await AsyncStorage.getItem('access_token');
      let res;
      if (accessToken) {
        res = await fetch(`http://10.0.2.2:8004/users/profile`, {
          method: 'GET',
          headers: {
            'Authorization': `Bearer ${accessToken}`,
            'Content-Type': 'application/json',
          },
        });
      }

      // Fallback to unauthenticated endpoint by user id
      if (!res || !res.ok) {
        res = await fetch(`http://10.0.2.2:8004/users/profile/${uid}`);
      }

      if (!res.ok) {
        setLoading(false);
        return;
      }

      const data = await res.json();
      // Normalize fields safely into our Profile type
      const normalized: Profile = {
        user_id: uid,
        full_name: data.full_name || '',
        hobbies: Array.isArray(data.hobbies) ? data.hobbies[0] || 'Music' : (data.hobbies || 'Music'),
        family_members: data.family_members ? Number(data.family_members) : 0,
        ambitions: Array.isArray(data.ambitions) ? data.ambitions : (data.ambitions ? [data.ambitions] : []),
        job_title: data.job_title || '',
        is_student: Boolean(data.is_student),
        is_married: Boolean(data.is_married),
        relationship_status: data.relationship_status || 'single',
        health_conditions: Array.isArray(data.health_conditions) ? data.health_conditions : (data.health_conditions ? [data.health_conditions] : []),
        favorite_songs: Array.isArray(data.favorite_songs) ? data.favorite_songs : (data.favorite_songs ? [data.favorite_songs] : []),
        province: data.province || '',
        village: data.village || '',
        profile_photo_url: data.profile_photo_url || undefined,
        lifestyle: data.lifestyle || { sleep: 7, exercise: 30, diet: 'good' },
      };
      
      // Cache the profile data
      const saveTimestamp = Date.now();
      await AsyncStorage.setItem('cached_profile_data', JSON.stringify(normalized));
      await AsyncStorage.setItem('profile_cache_time', saveTimestamp.toString());
      
      setProfile(normalized);
    } catch (e) {
      console.error('Failed to fetch profile', e);
    } finally {
      setLoading(false);
    }
  }, []); 

  const updateProfile = useCallback(async () => {
    if (!userId) {
      Alert.alert('Not logged in', 'Please log in to update profile');
      return;
    }
    try {
      // Get stored access token from AsyncStorage and include Authorization header
      const accessToken = await AsyncStorage.getItem('access_token');
      if (!accessToken) {
        Alert.alert('Authentication required', 'Please log in again');
        return;
      }

      // Normalize payload: ensure hobbies, health_conditions, favorite_songs are arrays
      const payload = {
        ...profile,
        hobbies: profile.hobbies ? [profile.hobbies] : [],
        health_conditions: profile.health_conditions || [],
        favorite_songs: profile.favorite_songs || [],
        lifestyle: {
          sleep: profile.lifestyle?.sleep ? Number(profile.lifestyle.sleep) : undefined,
          exercise: profile.lifestyle?.exercise ? Number(profile.lifestyle.exercise) : undefined,
          diet: profile.lifestyle?.diet || undefined,
        },
      };

      console.log('Outgoing profile payload:', payload);

      const res = await fetch(`http://10.0.2.2:8004/users/profile/${userId}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${accessToken}`,
        },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const err = await res.text();
        Alert.alert('Error', err);
        return;
      }

      Alert.alert('Success', 'Profile updated');
    } catch (e) {
      console.error(e);
      Alert.alert('Error', 'Failed to update profile');
    }
  }, [userId, profile]); 

  const pickImage = useCallback(async () => {
    try {
      const result = await launchImageLibrary({ mediaType: 'photo', includeBase64: false });
      if (result.didCancel) return;
      if (result.assets && result.assets.length > 0) {
        const asset = result.assets[0];
        uploadPhoto(asset);
      }
    } catch (e) {
      console.error('Image pick error', e);
    }
  }, []);

  const uploadPhoto = useCallback(async (asset: any) => {
    try {
      const uri = asset.uri;
      const filename = asset.fileName || 'photo.jpg';
      const match = /\.(\w+)$/.exec(filename);
      const type = match ? `image/${match[1]}` : 'image';

      const form = new FormData();
      // @ts-ignore
      form.append('file', {
        uri,
        name: filename,
        type,
      });

      if (!userId) { Alert.alert('Not logged in', 'Please log in to upload a photo'); return; }
      const accessToken = await AsyncStorage.getItem('access_token');
      const res = await fetch(`http://10.0.2.2:8004/users/profile/${userId}/upload-photo`, {
        method: 'POST',
        headers: {
          'Content-Type': 'multipart/form-data',
          'Authorization': `Bearer ${accessToken}`,
        },
        body: form,
      });

      if (!res.ok) {
        const err = await res.text();
        Alert.alert('Upload failed', err);
        return;
      }

      const data = await res.json();
      setProfile(prev => ({ ...prev, profile_photo_url: data.url }));
      Alert.alert('Uploaded', 'Profile photo updated');
    } catch (e) {
      console.error('Upload error', e);
      Alert.alert('Error', 'Failed to upload photo');
    }
  }, [userId]);



  // Ambitions (up to 3)
  const addAmbition = useCallback(() => {
    const ambition = newAmbition.trim();
    if (!ambition) return;
    setProfile(prev => {
      const next = [...prev.ambitions];
      if (next.includes(ambition)) return prev;
      if (next.length >= 3) {
        Alert.alert('Limit', 'You can add up to 3 ambitions');
        return prev;
      }
      next.push(ambition);
      return { ...prev, ambitions: next };
    });
    setNewAmbition('');
  }, [newAmbition]);

  const removeAmbition = useCallback((a: string) => {
    setProfile(prev => ({ ...prev, ambitions: (prev.ambitions || []).filter((x: string) => x !== a) }));
  }, []);

  // Favorite songs (up to 3 links)
  const addSong = useCallback(() => {
    const s = newSong.trim();
    if (!s) return;
    if (!s.startsWith('http')) {
      Alert.alert('Invalid link', 'Please enter a valid URL (must start with http)');
      return;
    }
    setProfile(prev => {
      const next = [...prev.favorite_songs];
      if (next.includes(s)) return prev;
      if (next.length >= 3) {
        Alert.alert('Limit', 'You can add up to 3 favorite songs');
        return prev;
      }
      next.push(s);
      return { ...prev, favorite_songs: next };
    });
    setNewSong('');
  }, [newSong]);

  const removeSong = useCallback((s: string) => {
    setProfile(prev => ({ ...prev, favorite_songs: (prev.favorite_songs || []).filter((x: string) => x !== s) }));
  }, []);

  return loading ? (
    <ProfileSkeleton />
  ) : (
    <ScrollView 
      style={styles.container} 
      contentContainerStyle={styles.contentContainer}
    >
      <Text style={styles.header}>My Profile</Text>

      <TouchableOpacity style={styles.photoRow} onPress={pickImage}>
        {profile.profile_photo_url ? (
          <Image source={{ uri: profile.profile_photo_url }} style={styles.avatar} />
        ) : (
          <View style={[styles.avatar, styles.avatarPlaceholder]}>
            <Text style={styles.avatarText}>Add Photo</Text>
          </View>
        )}
        <Text style={styles.photoText}>Tap to change photo</Text>
      </TouchableOpacity>

      <Text style={styles.label}>Full Name</Text>
      <TextInput style={styles.input} value={profile.full_name} onChangeText={(t) => setProfile({ ...profile, full_name: t })} />

      <Text style={styles.label}>Job Title</Text>
      <TextInput style={styles.input} value={profile.job_title} onChangeText={(t) => setProfile({ ...profile, job_title: t })} />

      <Text style={styles.label}>Ambitions (up to 3)</Text>
      <View style={styles.rowCenter}>
        <TextInput placeholder="Add ambition" style={[styles.input, styles.rowInput]} value={newAmbition} onChangeText={setNewAmbition} />
        <TouchableOpacity style={styles.addBtn} onPress={addAmbition}>
          <Text style={styles.addBtnText}>Add</Text>
        </TouchableOpacity>
      </View>
      <View style={styles.wrapRow}>
        {(profile.ambitions || []).map((a: string) => (
          <View key={a} style={styles.hobbyChip}>
            <Text style={styles.chipText}>{a}</Text>
            <TouchableOpacity onPress={() => removeAmbition(a)}><Text style={styles.removeText}>✕</Text></TouchableOpacity>
          </View>
        ))}
      </View>

      <Text style={styles.label}>Family Members</Text>
      <TextInput style={styles.input} value={String(profile.family_members)} keyboardType="number-pad" onChangeText={(t) => setProfile({ ...profile, family_members: parseInt(t || '0', 10) || 0 })} />

      <Text style={styles.label}>Hobbies (select one)</Text>
      <View style={styles.pickerBg}>
        <Picker selectedValue={profile.hobbies} onValueChange={(v: string) => setProfile({ ...profile, hobbies: v })}>
          {HOBBIES.map(h => (
            <Picker.Item key={h} label={h} value={h} />
          ))}
        </Picker>
      </View>

      <Text style={styles.label}>Marital Status</Text>
      <View style={styles.rowWithGap}>
        <TouchableOpacity onPress={() => setProfile({ ...profile, is_married: false })} style={[styles.smallBtn, !profile.is_married && styles.smallBtnActive]}>
          <Text style={[styles.smallBtnText, !profile.is_married ? styles.smallBtnTextActive : styles.smallBtnTextInactive]}>Unmarried</Text>
        </TouchableOpacity>
        <TouchableOpacity onPress={() => setProfile({ ...profile, is_married: true })} style={[styles.smallBtn, profile.is_married && styles.smallBtnActive]}>
          <Text style={[styles.smallBtnText, profile.is_married ? styles.smallBtnTextActive : styles.smallBtnTextInactive]}>Married</Text>
        </TouchableOpacity>
      </View>

      <Text style={styles.label}>Relationship</Text>
      <View style={styles.rowMarginBottom}>
        <TouchableOpacity onPress={() => setProfile({ ...profile, relationship_status: 'single' })} style={[styles.smallBtn, profile.relationship_status === 'single' && styles.smallBtnActive]}>
          <Text style={[styles.smallBtnText, profile.relationship_status === 'single' ? styles.smallBtnTextActive : styles.smallBtnTextInactive]}>Single</Text>
        </TouchableOpacity>
        <TouchableOpacity onPress={() => setProfile({ ...profile, relationship_status: 'in a relationship' })} style={[styles.smallBtn, profile.relationship_status === 'in a relationship' && styles.smallBtnActive]}>
          <Text style={[styles.smallBtnText, profile.relationship_status === 'in a relationship' ? styles.smallBtnTextActive : styles.smallBtnTextInactive]}>In Relationship</Text>
        </TouchableOpacity>
        <TouchableOpacity onPress={() => setProfile({ ...profile, relationship_status: 'complicated' })} style={[styles.smallBtn, profile.relationship_status === 'complicated' && styles.smallBtnActive]}>
          <Text style={[styles.smallBtnText, profile.relationship_status === 'complicated' ? styles.smallBtnTextActive : styles.smallBtnTextInactive]}>Complicated</Text>
        </TouchableOpacity>
        <TouchableOpacity onPress={() => setProfile({ ...profile, relationship_status: '' })} style={[styles.smallBtn, !profile.relationship_status && styles.smallBtnActive]}>
          <Text style={[styles.smallBtnText, !profile.relationship_status ? styles.smallBtnTextActive : styles.smallBtnTextInactive]}>Clear</Text>
        </TouchableOpacity>
      </View>

      <Text style={styles.label}>Health Conditions</Text>
      <HealthSelection selected={profile.health_conditions} onSelectIssues={(issues: string[]) => setProfile({ ...profile, health_conditions: issues })} />

      <Text style={styles.label}>Favorite Songs (up to 3)</Text>
      <View style={styles.rowCenter}>
        <TextInput placeholder="Add song URL" style={[styles.input, styles.rowInput]} value={newSong} onChangeText={setNewSong} />
        <TouchableOpacity style={styles.addBtn} onPress={addSong}>
          <Text style={styles.addBtnText}>Add</Text>
        </TouchableOpacity>
      </View>
      <View style={styles.songList}>
        {(profile.favorite_songs || []).map((s: string) => (
          <View key={s} style={[styles.hobbyChip, styles.songRow]}>
            <Text style={styles.songText}>{s}</Text>
            <TouchableOpacity onPress={() => removeSong(s)}><Text style={styles.removeText}>✕</Text></TouchableOpacity>
          </View>
        ))}
      </View>

      <Text style={styles.label}>Lifestyle</Text>
      <View style={[styles.rowCenter, styles.lifestyleRow]}> 
        <View style={styles.lifestyleInputContainer}>
          <Text style={styles.smallLabel}>Sleep (hrs)</Text>
          <TextInput
            style={styles.input}
            keyboardType="numeric"
            value={profile.lifestyle && String(profile.lifestyle.sleep !== undefined ? profile.lifestyle.sleep : '')}
            onChangeText={(t) => setProfile({ ...profile, lifestyle: { ...(profile.lifestyle || {}), sleep: t === '' ? undefined : Number(t) } })}
          />
        </View>

        <View style={styles.lifestyleInputContainer2}>
          <Text style={styles.smallLabel}>Exercise (min)</Text>
          <TextInput
            style={styles.input}
            keyboardType="numeric"
            value={profile.lifestyle && String(profile.lifestyle.exercise !== undefined ? profile.lifestyle.exercise : '')}
            onChangeText={(t) => setProfile({ ...profile, lifestyle: { ...(profile.lifestyle || {}), exercise: t === '' ? undefined : Number(t) } })}
          />
        </View>
      </View>

      <Text style={styles.label}>Diet</Text>
      <View style={styles.pickerBg}>
        <Picker
          selectedValue={profile.lifestyle?.diet || 'good'}
          onValueChange={(v) => setProfile({ ...profile, lifestyle: { ...(profile.lifestyle || {}), diet: v } })}
        >
          <Picker.Item label="Good" value="good" />
          <Picker.Item label="Okay" value="okay" />
          <Picker.Item label="Poor" value="poor" />
        </Picker>
      </View>

      <Text style={styles.label}>Province</Text>
      <TextInput style={styles.input} value={profile.province} onChangeText={(t) => setProfile({ ...profile, province: t })} />

      <Text style={styles.label}>Village</Text>
      <TextInput style={styles.input} value={profile.village} onChangeText={(t) => setProfile({ ...profile, village: t })} />

      <TouchableOpacity style={styles.saveBtn} onPress={updateProfile}>
        <Text style={styles.saveBtnText}>{loading ? 'Loading...' : 'Save Profile'}</Text>
      </TouchableOpacity>


    </ScrollView>
  );
});

const styles = StyleSheet.create({
  container: { padding: 20, backgroundColor: '#f5f5f5' },
  contentContainer: { paddingBottom: 60 },
  header: { fontSize: 24, fontWeight: 'bold', marginBottom: 20, textAlign: 'center' },
  label: { marginTop: 12, marginBottom: 6 },
  smallLabel: { fontSize: 12, color: '#666', marginBottom: 4 },
  input: { borderWidth: 1, borderColor: '#e0e0e0', borderRadius: 8, padding: 10, backgroundColor: '#fff' },
  avatar: { width: 96, height: 96, borderRadius: 48 },
  avatarPlaceholder: { backgroundColor: '#007AFF', alignItems: 'center', justifyContent: 'center' },
  avatarText: { color: '#fff', fontWeight: '600' },
  photoRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 18 },
  photoText: { marginLeft: 12 },
  rowCenter: { flexDirection: 'row', alignItems: 'center' },
  rowWithGap: { flexDirection: 'row', alignItems: 'center' },
  rowMarginBottom: { flexDirection: 'row', marginBottom: 8 },
  rowInput: { flex: 1, marginRight: 8 },
  wrapRow: { flexDirection: 'row', flexWrap: 'wrap', marginTop: 8 },
  hobbyChip: { flexDirection: 'row', alignItems: 'center', padding: 8, backgroundColor: '#fff', borderRadius: 16, marginRight: 8, marginBottom: 8 },
  chipText: { color: '#333' },
  removeText: { marginLeft: 8 },
  smallBtn: { padding: 8, borderRadius: 8, borderWidth: 1, borderColor: '#ddd', marginRight: 8 },
  smallBtnActive: { backgroundColor: '#007AFF', borderColor: '#007AFF' },
  smallBtnText: { fontWeight: '600' },
  smallBtnTextActive: { color: '#fff' },
  smallBtnTextInactive: { color: '#333' },
  saveBtn: { marginTop: 20, backgroundColor: '#007AFF', padding: 14, borderRadius: 8, alignItems: 'center' },
  saveBtnText: { color: '#fff', fontWeight: 'bold' },
  addBtn: { paddingHorizontal: 12, paddingVertical: 10, borderRadius: 8, borderWidth: 1, borderColor: '#007AFF', backgroundColor: '#fff', alignItems: 'center', justifyContent: 'center' },
  addBtnText: { color: '#007AFF' },
  pickerBg: { backgroundColor: '#fff', borderRadius: 8, marginTop: 5, borderWidth: 1, borderColor: '#ddd' },
  songList: { marginTop: 8 },
  songRow: { justifyContent: 'space-between', width: '100%' },
  songText: { color: '#333', flex: 1 },
  lifestyleRow: { marginBottom: 8 },
  lifestyleInputContainer: { flex: 1, marginRight: 8 },
  lifestyleInputContainer2: { flex: 1 },
});

export default ProfileScreen;
