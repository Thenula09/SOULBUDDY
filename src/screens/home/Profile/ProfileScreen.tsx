import React, { useEffect, useState, useCallback } from 'react';
import { View, Text, StyleSheet, Image, ActivityIndicator, Alert, TextInput, TouchableOpacity, ScrollView } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { launchImageLibrary } from 'react-native-image-picker';
import { useIsFocused, useNavigation } from '@react-navigation/native';
import { profileService } from '../../../services/api';
import { API_ENDPOINTS, fetchWithTimeout, API_CONFIG } from '../../../config/api';
import { supabase } from '../../../services/supabase';
import useStore from '../../../store/useStore';

const HOBBIES_PRESET = ['Reading','Traveling','Cooking','Gaming','Photography','Gardening','Painting','Writing','Music','Dancing'];
const HEALTH_PRESET = ['Diabetes','Hypertension','Asthma','Anxiety','Depression','Allergy','Back Pain','Arthritis','Migraine','Thyroid','Cardiac','Obesity','Insomnia','Skin Condition','Other'];

const ProfileScreen: React.FC = () => {
  const [loading, setLoading] = useState(true);
  const [userId, setUserId] = useState<string | null>(null);
  const [fullName, setFullName] = useState('');
  const [photoUri, setPhotoUri] = useState<string | undefined>(undefined);
  const [hobbies, setHobbies] = useState<string[]>([]);
  const [newHobby, setNewHobby] = useState('');
  const [gender, setGender] = useState<'male'|'female'|'other'|null>(null);
  const [healthConditions, setHealthConditions] = useState<string[]>([]);
  const [newCondition, setNewCondition] = useState('');
  const [serverProfileMissing, setServerProfileMissing] = useState(false);
  
  // New fields
  const [petName, setPetName] = useState('');
  const [jobTitle, setJobTitle] = useState('');
  const [topCompany, setTopCompany] = useState('');
  const [familyMembers, setFamilyMembers] = useState(0);
  const [age, setAge] = useState<number | undefined>(undefined);
  const [weight, setWeight] = useState<number | undefined>(undefined);
  const [province, setProvince] = useState('');
  const [city, setCity] = useState('');
  const [village, setVillage] = useState('');
  const [sleepHours, setSleepHours] = useState<number | undefined>(undefined);
  const [exerciseTime, setExerciseTime] = useState('');
  const [sleepLatency, setSleepLatency] = useState<number | undefined>(undefined);

  const isFocused = useIsFocused();
  const navigation = useNavigation();
  const logoutStore = useStore(state => state.logout);

  const loadLocal = useCallback(async () => {
    const uid = await AsyncStorage.getItem('user_id');
    const name = await AsyncStorage.getItem('user_name');
    const email = await AsyncStorage.getItem('user_email');
    const localPhoto = uid ? await AsyncStorage.getItem(`profile_photo_${uid}`) : await AsyncStorage.getItem('profile_photo');
    const localProfile = uid ? await AsyncStorage.getItem(`local_profile_${uid}`) : await AsyncStorage.getItem('local_profile');
    
    console.log('ProfileScreen loadLocal - uid:', uid, 'name:', name, 'email:', email);
    setUserId(uid);
    
    // Set display name with priority: name > email > "Please log in"
    let displayName = name || email || 'Please log in again';
    setFullName(displayName);
    setPhotoUri(localPhoto || undefined);
    
    // Reset all fields to empty first
    setHobbies([]);
    setGender(null);
    setHealthConditions([]);
    setPetName('');
    setJobTitle('');
    setTopCompany('');
    setFamilyMembers(0);
    setAge(undefined);
    setWeight(undefined);
    setProvince('');
    setCity('');
    setVillage('');
    setSleepHours(undefined);
    setExerciseTime('');
    setSleepLatency(undefined);
    
    // Load local profile if it exists for THIS user
    if (localProfile && uid) {
      try {
        const parsed = JSON.parse(localProfile);
        console.log('ProfileScreen - loading local profile for user:', uid);
        setHobbies(parsed.hobbies || []);
        setGender(parsed.gender || null);
        setHealthConditions(parsed.health_conditions || []);
        // Load new fields
        setPetName(parsed.pet_name || '');
        setJobTitle(parsed.job_title || '');
        setTopCompany(parsed.top_company || '');
        setFamilyMembers(parsed.family_members || 0);
        setAge(parsed.age || undefined);
        setWeight(parsed.weight || undefined);
        setProvince(parsed.province || '');
        setCity(parsed.city || '');
        setVillage(parsed.village || '');
        setSleepHours(parsed.sleep_hours || undefined);
        setExerciseTime(parsed.exercise_time || '');
        setSleepLatency(parsed.sleep_latency || undefined);
      } catch (e) {
        console.warn('Failed to parse local profile', e);
      }
    }

    // still show local data quickly, then attempt to refresh from server (if logged in)
    setLoading(false);

    // Prefer authoritative Supabase session for current user email/name (if available)
    try {
      const { data } = await supabase.auth.getUser();
      const sbUser: any = data?.user ?? null;
      if (sbUser) {
        const display = sbUser.user_metadata?.full_name || sbUser.email || displayName;
        if (display && display !== displayName) {
          setFullName(display);
          try { await AsyncStorage.setItem('user_name', display); } catch {}
          try { await AsyncStorage.setItem('cached_user_name', display); await AsyncStorage.setItem('cache_time', Date.now().toString()); } catch {}
        }
      }
    } catch {
      // ignore - fall back to local storage / server calls below
    }

    if (uid) {
      (async () => {
        try {
          const token = await AsyncStorage.getItem('access_token');
          if (token) {
            // First fetch basic user info for name
            const resp = await fetchWithTimeout(API_ENDPOINTS.USER_BY_ID(Number(uid)), { headers: { Authorization: `Bearer ${token}` } }, API_CONFIG.TIMEOUT.PROFILE);
            if (resp.ok) {
              const user = await resp.json();
              if (user.full_name && user.full_name !== displayName) {
                setFullName(user.full_name);
                await AsyncStorage.setItem('user_name', user.full_name);
                await AsyncStorage.setItem('cached_user_name', user.full_name);
                await AsyncStorage.setItem('cache_time', Date.now().toString());
              }
            }
          }

          // Then fetch server profile for THIS user only
          const serverProfile: any = await profileService.getProfile(uid);
          console.log('ProfileScreen - server profile for user:', uid, serverProfile);

          // Load server profile data for THIS user (overwrites local if exists)
          if (serverProfile) {
            console.log('ProfileScreen - loading server profile data');
            setHobbies(serverProfile.hobbies || []);
            setGender(serverProfile.gender || null);
            setHealthConditions(serverProfile.health_conditions || []);
            setPetName(serverProfile.pet_name || '');
            setJobTitle(serverProfile.job_title || '');
            setTopCompany(serverProfile.top_company || '');
            setFamilyMembers(serverProfile.family_members || 0);
            setAge(serverProfile.age || undefined);
            setWeight(serverProfile.weight || undefined);
            setProvince(serverProfile.province || '');
            setCity(serverProfile.city || '');
            setVillage(serverProfile.village || '');
            setSleepHours(serverProfile.sleep_hours || undefined);
            setExerciseTime(serverProfile.exercise_time || '');
            setSleepLatency(serverProfile.sleep_latency || undefined);

            // server may provide a profile photo URL
            if (serverProfile.profile_photo_url) {
              setPhotoUri(serverProfile.profile_photo_url);
              try { await AsyncStorage.setItem(`profile_photo_${uid}`, serverProfile.profile_photo_url); } catch {}
            }

            // cache server profile locally so next open is fast
            try { await AsyncStorage.setItem(`local_profile_${uid}`, JSON.stringify(serverProfile)); } catch {}
          } else {
            console.log('ProfileScreen - no server profile found, keeping empty fields');
          }
        } catch {
          console.warn('Failed to fetch server profile (non-fatal)');
        }
      })();
    }
  }, []);

  useEffect(() => {
    loadLocal();
  }, [loadLocal]);

  useEffect(() => {
    if (isFocused) {
      loadLocal();
    }
  }, [isFocused, loadLocal]);

  const pickImage = async () => {
    try {
      const result = await launchImageLibrary({ mediaType: 'photo', includeBase64: false });
      if (result.didCancel) return;
      if (result.assets && result.assets.length > 0) {
        const asset = result.assets[0];
        const uri = asset.uri;
        setPhotoUri(uri);
        const key = userId ? `profile_photo_${userId}` : 'profile_photo';
        await AsyncStorage.setItem(key, uri || '');
        Alert.alert('Saved', 'Profile photo saved locally');
      }
    } catch (e) {
      console.warn('Image pick error', e);
      Alert.alert('Error', 'Failed to pick image');
    }
  };

  const toggleHobby = (h: string) => {
    setHobbies(prev => {
      if (prev.includes(h)) return prev.filter(x => x !== h);
      if (prev.length >= 3) { Alert.alert('Limit', 'You can add up to 3 hobbies'); return prev; }
      return [...prev, h];
    });
  };

  const addHobby = () => {
    const v = newHobby.trim();
    if (!v) return;
    if (hobbies.includes(v)) { setNewHobby(''); return; }
    if (hobbies.length >= 3) { Alert.alert('Limit', 'You can add up to 3 hobbies'); return; }
    setHobbies(prev => [...prev, v]);
    setNewHobby('');
  };

  const toggleCondition = (c: string) => {
    setHealthConditions(prev => {
      if (prev.includes(c)) return prev.filter(x => x !== c);
      if (prev.length >= 15) { Alert.alert('Limit', 'You can select up to 15 conditions'); return prev; }
      return [...prev, c];
    });
  };

  const addCondition = () => {
    const v = newCondition.trim();
    if (!v) return;
    if (healthConditions.includes(v)) { setNewCondition(''); return; }
    if (healthConditions.length >= 15) { Alert.alert('Limit', 'You can select up to 15 conditions'); return; }
    setHealthConditions(prev => [...prev, v]);
    setNewCondition('');
  };

  const saveLocalProfile = async () => {
    const key = userId ? `local_profile_${userId}` : 'local_profile';
    const payload = { 
      full_name: fullName, 
      hobbies, 
      gender, 
      health_conditions: healthConditions, 
      profile_photo_url: photoUri,
      // New fields
      pet_name: petName,
      job_title: jobTitle,
      top_company: topCompany,
      family_members: familyMembers,
      age: age,
      weight: weight,
      province: province,
      city: city,
      village: village,
      sleep_hours: sleepHours,
      exercise_time: exerciseTime,
      sleep_latency: sleepLatency
    };
    await AsyncStorage.setItem(key, JSON.stringify(payload));
    await AsyncStorage.setItem('user_name', fullName);
    Alert.alert('Saved', 'Profile saved locally');
  };

  const clearLocal = async () => {
    Alert.alert('Clear local profile?', 'This will remove locally saved profile data. Continue?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Clear', style: 'destructive', onPress: async () => {
          const uid = userId;
          if (uid) {
            await AsyncStorage.removeItem(`local_profile_${uid}`);
            await AsyncStorage.removeItem(`profile_photo_${uid}`);
          } else {
            await AsyncStorage.removeItem('local_profile');
            await AsyncStorage.removeItem('profile_photo');
          }
          setFullName(''); setHobbies([]); setGender(null); setHealthConditions([]); setPhotoUri(undefined);
          // Clear new fields
          setPetName(''); setJobTitle(''); setTopCompany(''); setFamilyMembers(0);
          setAge(undefined); setWeight(undefined); setProvince(''); setCity(''); setVillage('');
          setSleepHours(undefined); setExerciseTime(''); setSleepLatency(undefined);
          Alert.alert('Cleared', 'Local profile data removed');
        }}
    ]);
  };

  if (loading) return <View style={styles.center}><ActivityIndicator /></View>;

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.contentContainer}>
      <Text style={styles.title}>Profile</Text>

      {serverProfileMissing && (
        <View style={styles.missingBanner}>
          <Text style={styles.missingBannerText}>Please complete your profile — it hasn't been saved to the server yet.</Text>
        </View>
      )}

      {/* Photo & Name Section */}
      <View style={styles.sectionCard}>
        <View style={styles.photoSection}>
          <View style={styles.photoWrapper}>
            {photoUri ? (
              <Image source={{ uri: photoUri }} style={styles.avatar} />
            ) : (
              <View style={[styles.avatar, styles.avatarPlaceholder]}>
                <Text style={styles.avatarText}>Add Photo</Text>
              </View>
            )}
            <TouchableOpacity style={styles.editBadge} onPress={pickImage}>
              <Text style={styles.editBadgeText}>✎</Text>
            </TouchableOpacity>
          </View>
          <View style={styles.nameSection}>
            <Text style={styles.fieldLabel}>Full Name</Text>
            <Text style={styles.nameText}>{fullName || 'Please log in again'}</Text>
          </View>
        </View>
      </View>

      {/* Optional Fields Notice */}
      <View style={[styles.sectionCard, styles.optionalCard]}>
        <Text style={styles.optionalTitle}>📝 Optional Profile Information</Text>
        <Text style={styles.optionalText}>Fill only the fields you want to save. All fields are optional!</Text>
      </View>

      {/* Gender Section */}
      <View style={styles.sectionCard}>
        <Text style={styles.sectionTitle}>Gender</Text>
        <View style={styles.rowWithGap}>
          <TouchableOpacity onPress={() => setGender('male')} style={[styles.smallBtn, gender === 'male' && styles.smallBtnActive]}><Text style={gender === 'male' ? styles.smallBtnTextActive : styles.smallBtnText}>Male</Text></TouchableOpacity>
          <TouchableOpacity onPress={() => setGender('female')} style={[styles.smallBtn, gender === 'female' && styles.smallBtnActive]}><Text style={gender === 'female' ? styles.smallBtnTextActive : styles.smallBtnText}>Female</Text></TouchableOpacity>
          <TouchableOpacity onPress={() => setGender('other')} style={[styles.smallBtn, gender === 'other' && styles.smallBtnActive]}><Text style={gender === 'other' ? styles.smallBtnTextActive : styles.smallBtnText}>Other</Text></TouchableOpacity>
        </View>
      </View>

      {/* Personal Info Section */}
      <View style={styles.sectionCard}>
        <Text style={styles.sectionTitle}>Personal Information</Text>
        <Text style={styles.fieldLabel}>Pet Name</Text>
        <TextInput style={styles.textInput} value={petName} onChangeText={setPetName} placeholder="Enter pet name" />
        
        <View style={styles.rowWithGap}>
          <View style={styles.halfField}>
            <Text style={styles.fieldLabel}>Age</Text>
            <TextInput style={styles.textInput} value={age ? String(age) : ''} onChangeText={(t) => setAge(t ? Number(t) : undefined)} placeholder="25" keyboardType="number-pad" />
          </View>
          <View style={styles.halfField}>
            <Text style={styles.fieldLabel}>Weight (kg)</Text>
            <TextInput style={styles.textInput} value={weight ? String(weight) : ''} onChangeText={(t) => setWeight(t ? Number(t) : undefined)} placeholder="70" keyboardType="numeric" />
          </View>
        </View>
      </View>

      {/* Employment Section */}
      <View style={styles.sectionCard}>
        <Text style={styles.sectionTitle}>Employment</Text>
        <Text style={styles.fieldLabel}>Job Title</Text>
        <TextInput style={styles.textInput} value={jobTitle} onChangeText={setJobTitle} placeholder="Enter job title" />
        
        <Text style={styles.fieldLabel}>Top Company</Text>
        <TextInput style={styles.textInput} value={topCompany} onChangeText={setTopCompany} placeholder="Enter company name" />
      </View>

      {/* Family Section */}
      <View style={styles.sectionCard}>
        <Text style={styles.sectionTitle}>Family</Text>
        <Text style={styles.fieldLabel}>Family Members</Text>
        <TextInput style={styles.textInput} value={String(familyMembers)} onChangeText={(t) => setFamilyMembers(Number(t) || 0)} placeholder="4" keyboardType="number-pad" />
      </View>

      {/* Location Section */}
      <View style={styles.sectionCard}>
        <Text style={styles.sectionTitle}>Location</Text>
        <Text style={styles.fieldLabel}>Province</Text>
        <TextInput style={styles.textInput} value={province} onChangeText={setProvince} placeholder="Enter province" />
        
        <Text style={styles.fieldLabel}>City</Text>
        <TextInput style={styles.textInput} value={city} onChangeText={setCity} placeholder="Enter city" />
        
        <Text style={styles.fieldLabel}>Village</Text>
        <TextInput style={styles.textInput} value={village} onChangeText={setVillage} placeholder="Enter village" />
      </View>

      {/* Lifestyle Section */}
      <View style={styles.sectionCard}>
        <Text style={styles.sectionTitle}>Lifestyle & Health</Text>
        <View style={styles.rowWithGap}>
          <View style={styles.halfField}>
            <Text style={styles.fieldLabel}>Sleep Hours</Text>
            <TextInput style={styles.textInput} value={sleepHours ? String(sleepHours) : ''} onChangeText={(t) => setSleepHours(t ? Number(t) : undefined)} placeholder="8" keyboardType="numeric" />
          </View>
          <View style={styles.halfField}>
            <Text style={styles.fieldLabel}>Time to Fall Asleep (min)</Text>
            <TextInput style={styles.textInput} value={sleepLatency ? String(sleepLatency) : ''} onChangeText={(t) => setSleepLatency(t ? Number(t) : undefined)} placeholder="15" keyboardType="number-pad" />
          </View>
        </View>
        
        <Text style={styles.fieldLabel}>Exercise Time</Text>
        <TextInput style={styles.textInput} value={exerciseTime} onChangeText={setExerciseTime} placeholder="Morning / 18:00 / etc" />
      </View>

      {/* Hobbies Section */}
      <View style={styles.sectionCard}>
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Hobbies</Text>
          <Text style={styles.counter}>{hobbies.length}/3</Text>
        </View>
        <View style={styles.wrapRow}>
          {HOBBIES_PRESET.map(h => {
            const active = hobbies.includes(h);
            return (
              <TouchableOpacity key={h} onPress={() => toggleHobby(h)} style={[styles.hobbyChip, active && styles.hobbyChipActive]}>
                <Text style={active ? styles.chipTextActive : styles.chipText}>{h}</Text>
              </TouchableOpacity>
            );
          })}
        </View>
        <View style={styles.inputRow}>
          <TextInput placeholder="Add custom hobby" style={styles.input} value={newHobby} onChangeText={setNewHobby} />
          <TouchableOpacity style={styles.addBtn} onPress={addHobby}><Text style={styles.addBtnText}>+</Text></TouchableOpacity>
        </View>
      </View>

      {/* Health Conditions Section */}
      <View style={styles.sectionCard}>
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Health Conditions</Text>
          <Text style={styles.counter}>{healthConditions.length}/15</Text>
        </View>
        <View style={styles.wrapRow}>
          {HEALTH_PRESET.map(c => {
            const act = healthConditions.includes(c);
            return (
              <TouchableOpacity key={c} onPress={() => toggleCondition(c)} style={[styles.condChip, act && styles.condChipActive]}>
                <Text style={act ? styles.chipTextActive : styles.chipText}>{c}</Text>
              </TouchableOpacity>
            );
          })}
        </View>
        <View style={styles.inputRow}>
          <TextInput placeholder="Add custom condition" style={styles.input} value={newCondition} onChangeText={setNewCondition} />
          <TouchableOpacity style={styles.addBtn} onPress={addCondition}><Text style={styles.addBtnText}>+</Text></TouchableOpacity>
        </View>
      </View>

      {/* Actions Section */}
      <View style={styles.sectionCard}>
        <Text style={styles.sectionTitle}>Profile Actions</Text>
        <TouchableOpacity style={styles.actionBtn} onPress={saveLocalProfile}>
          <Text style={styles.actionBtnText}>💾 Save Profile Locally</Text>
        </TouchableOpacity>
        <TouchableOpacity style={[styles.actionBtn, styles.serverSaveBtn]} onPress={async () => {
            if (!userId) { Alert.alert('Not logged in', 'Please log in to save your profile to the server.'); return; }
            const payload = { 
              full_name: fullName, 
              hobbies, 
              gender, 
              health_conditions: healthConditions, 
              profile_photo_url: photoUri,
              pet_name: petName,
              job_title: jobTitle,
              top_company: topCompany,
              family_members: familyMembers,
              age: age,
              weight: weight,
              province: province,
              city: city,
              village: village,
              sleep_hours: sleepHours,
              exercise_time: exerciseTime,
              sleep_latency: sleepLatency
            };
            try {
              setLoading(true);
              await profileService.updateProfile(userId, payload);
              await AsyncStorage.setItem(`local_profile_${userId}`, JSON.stringify(payload));
              Alert.alert('Saved', 'Profile saved to server');
              setServerProfileMissing(false);
            } catch (e) {
              console.warn('Failed to save profile to server', e);
              Alert.alert('Error', 'Failed to save profile to server');
            } finally { setLoading(false); }
          }}>
          <Text style={styles.actionBtnText}>☁️ Save Profile to Server</Text>
        </TouchableOpacity>
        <TouchableOpacity style={[styles.actionBtn, styles.clearBtn]} onPress={clearLocal}>
          <Text style={styles.clearBtnText}>🗑️ Clear Local Data</Text>
        </TouchableOpacity>
        {/* Logout button */}
        <TouchableOpacity
          style={[styles.actionBtn, styles.logoutBtn]}
          onPress={() => {
            Alert.alert('Log out', 'Are you sure you want to log out?', [
              { text: 'Cancel', style: 'cancel' },
              { text: 'Log out', style: 'destructive', onPress: async () => {
                  // Supabase sign out + clear local state/storage
                  try { await supabase.auth.signOut(); } catch { console.warn('supabase signOut failed'); }

                  const uid = await AsyncStorage.getItem('user_id');
                  const keysToRemove = [
                    'access_token', 'user_id', 'user_email', 'user_name', 'cached_user_name', 'cache_time',
                    'profile_photo', 'local_profile'
                  ];
                  if (uid) {
                    keysToRemove.push(`local_profile_${uid}`, `profile_photo_${uid}`);
                  }
                  try { await AsyncStorage.multiRemove(keysToRemove); } catch { /* ignore */ }

                  try { logoutStore(); } catch { /* ignore */ }

                  // navigate to Login (reset stack)
                  try { navigation.reset({ index: 0, routes: [{ name: 'Login' as any }] }); } catch { navigation.navigate('Login' as any); }
                }}
            ]);
          }}
        >
          <Text style={styles.actionBtnText}>🔓 Log out</Text>
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f5f7fa' },
  contentContainer: { padding: 16, paddingBottom: 32 },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  title: { fontSize: 24, fontWeight: '700', marginBottom: 16, color: '#1a1a1a' },
  
  // Optional Fields Notice
  optionalTitle: { fontSize: 16, fontWeight: '600', color: '#2196F3', marginBottom: 8, textAlign: 'center' },
  optionalText: { fontSize: 14, color: '#666', textAlign: 'center', lineHeight: 20 },
  optionalCard: { backgroundColor: '#f0f8ff' },
  
  // Section Card
  sectionCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 4,
    elevation: 3,
  },
  sectionTitle: { fontSize: 16, fontWeight: '600', color: '#1a1a1a', marginBottom: 12 },
  sectionHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
  counter: { fontSize: 14, fontWeight: '500', color: '#FF0000' },
  missingBanner: { backgroundColor: '#FFF4E5', borderRadius: 8, padding: 10, marginBottom: 12, borderWidth: 1, borderColor: '#FFD8A8' },
  missingBannerText: { color: '#8A4B00', fontSize: 13 },
  
  // Photo Section
  photoSection: { flexDirection: 'row', alignItems: 'center', gap: 16 },
  photoWrapper: { position: 'relative' },
  avatar: { width: 80, height: 80, borderRadius: 40, backgroundColor: '#e0e7ff' },
  avatarPlaceholder: { justifyContent: 'center', alignItems: 'center' },
  avatarText: { color: '#666', fontSize: 12 },
  editBadge: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: '#FF0000',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#fff',
  },
  editBadgeText: { color: '#fff', fontSize: 14, fontWeight: '600' },
  nameSection: { flex: 1 },
  fieldLabel: { fontSize: 12, color: '#666', marginBottom: 6 },
  nameText: { fontSize: 18, fontWeight: '600', color: '#1a1a1a' },
  
  // Gender Buttons
  rowWithGap: { flexDirection: 'row', gap: 8 },
  smallBtn: { flex: 1, padding: 10, borderRadius: 8, borderWidth: 1, borderColor: '#e0e7ff', backgroundColor: '#fff', alignItems: 'center' },
  smallBtnActive: { backgroundColor: '#FF0000', borderColor: '#FF0000' },
  smallBtnText: { fontSize: 14, color: '#1a1a1a' },
  smallBtnTextActive: { fontSize: 14, color: '#fff', fontWeight: '600' },
  
  // Chips
  wrapRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 12 },
  hobbyChip: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 16, borderWidth: 1, borderColor: '#e0e7ff', backgroundColor: '#fff' },
  hobbyChipActive: { backgroundColor: '#FF0000', borderColor: '#FF0000' },
  condChip: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 16, borderWidth: 1, borderColor: '#e0e7ff', backgroundColor: '#fff' },
  condChipActive: { backgroundColor: '#FF0000', borderColor: '#FF0000' },
  chipText: { fontSize: 13, color: '#1a1a1a' },
  chipTextActive: { fontSize: 13, color: '#fff', fontWeight: '600' },
  
  // Input Row
  inputRow: { flexDirection: 'row', gap: 8, alignItems: 'center' },
  input: { flex: 1, borderWidth: 1, borderColor: '#e0e7ff', backgroundColor: '#f8f9ff', padding: 10, borderRadius: 8, fontSize: 14 },
  addBtn: { width: 40, height: 40, borderRadius: 8, backgroundColor: '#FF0000', justifyContent: 'center', alignItems: 'center' },
  addBtnText: { color: '#fff', fontSize: 20, fontWeight: '600' },
  
  // New text input styles
  textInput: { borderWidth: 1, borderColor: '#e6eef6', borderRadius: 8, padding: 12, backgroundColor: '#fff', marginTop: 4, marginBottom: 12 },
  halfField: { flex: 1, marginHorizontal: 4 },
  
  // Action Buttons
  actionBtn: { backgroundColor: '#FF0000', padding: 14, borderRadius: 8, marginBottom: 8, alignItems: 'center' },
  serverSaveBtn: { backgroundColor: '#2B8A3E' },
  clearBtn: { backgroundColor: '#fff', borderWidth: 1, borderColor: '#FF6B6B' },
  actionBtnText: { color: '#fff', fontSize: 15, fontWeight: '600' },
  clearBtnText: { color: '#FF6B6B', fontSize: 15, fontWeight: '600' },
  logoutBtn: { backgroundColor: '#444', marginTop: 8 }
});

export default ProfileScreen;
