import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import HomeScreen from '../screens/home/Home/HomeScreen';
import LifestyleScreen from '../screens/home/Lifestyle/LifestyleScreen';
import ProfileScreen from '../screens/home/Profile/ProfileScreen';

type Tab = 'Home' | 'Lifestyles' | 'Profile';

const MainTabs = () => {
  const [active, setActive] = useState<Tab>('Home');
  const [loadedScreens, setLoadedScreens] = useState<Set<Tab>>(new Set(['Home']));
  const navigation: any = useNavigation();

  // Load screen on first access (lazy mounting)
  const handleTabPress = (tab: Tab) => {
    setActive(tab);
    if (!loadedScreens.has(tab)) {
      setLoadedScreens(prev => new Set([...prev, tab]));
    }
  };

  // Render current screen
  const renderActiveScreen = () => {
    switch (active) {
      case 'Home':
        return <HomeScreen />;
      case 'Lifestyles':
        return loadedScreens.has('Lifestyles') ? <LifestyleScreen /> : null;
      case 'Profile':
        return loadedScreens.has('Profile') ? <ProfileScreen /> : null;
      default:
        return <HomeScreen />;
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.scene}>
        {renderActiveScreen()}
      </View>

      <View style={styles.tabBar}>
        <TabButton label="Home" icon="🏠" active={active === 'Home'} onPress={() => handleTabPress('Home')} />
        <TabButton label="Chat" icon="💬" active={false} onPress={() => navigation.navigate('Chat')} />
        <TabButton label="Lifestyles" icon="🌟" active={active === 'Lifestyles'} onPress={() => handleTabPress('Lifestyles')} />
        <TabButton label="Profile" icon="👤" active={active === 'Profile'} onPress={() => handleTabPress('Profile')} />
      </View>
    </View>
  );
};

const TabButton = ({ label, icon, active, onPress }: { label: string; icon: string; active: boolean; onPress: () => void; }) => (
  <TouchableOpacity style={[styles.tabButton, active && styles.tabButtonActive]} onPress={onPress}>
    <Text style={[styles.icon]}>{icon}</Text>
    <Text style={[styles.label, active && styles.labelActive]}>{label}</Text>
  </TouchableOpacity>
);

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fff' },
  scene: { flex: 1 },
  tabBar: {
    height: 65,
    flexDirection: 'row',
    backgroundColor: '#FF0000',
    borderRadius: 30,
    marginHorizontal: 20,
    marginBottom: 20,
    paddingHorizontal: 10,
    alignItems: 'center',
    justifyContent: 'space-around',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -3 },
    shadowOpacity: 0.1,
    shadowRadius: 5,
    elevation: 10,
  },
  tabButton: { 
    alignItems: 'center',
    justifyContent: 'center',
    width: 60,
    height: 60,
  },
  tabButtonActive: {
    backgroundColor: '#fff',
    borderRadius: 30,
    width: 60,
    height: 60,
    marginTop: -30,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 5,
    elevation: 8,
  },
  icon: { fontSize: 24 },
  label: { fontSize: 10, color: '#fff', marginTop: 2 },
  labelActive: { color: '#FF0000', fontWeight: '600' },
});

export default MainTabs;
