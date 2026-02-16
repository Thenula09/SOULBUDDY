import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { useNavigation, useRoute } from '@react-navigation/native';
import HomeScreen from '../screens/home/Home/HomeScreen';
import LifestyleScreen from '../screens/home/Lifestyle/LifestyleScreen';
import ProfileScreen from '../screens/home/Profile/ProfileScreen';

type Tab = 'Home' | 'Lifestyle' | 'Profile';

const MainTabs = () => {
  const [active, setActive] = useState<Tab>('Home');
  const [loadedScreens, setLoadedScreens] = useState<Set<Tab>>(new Set(['Home']));
  const navigation: any = useNavigation();
  const route: any = useRoute();

  React.useEffect(() => { console.log('MainTabs mounted - initial active:', active); }, []);

  useEffect(() => {
    const initialTab = route?.params?.initialTab as Tab | undefined;
    if (initialTab && ['Home','Lifestyle','Profile','Lifestyles'].includes(initialTab as string)) {
      // accept both 'Lifestyle' and legacy 'Lifestyles'
      const tabKey = (initialTab === 'Lifestyles') ? 'Lifestyle' : initialTab;
      setActive(tabKey as Tab);
      setLoadedScreens(prev => new Set([...prev, tabKey as Tab]));
      // clear the param so it doesn't re-trigger
      try { navigation.setParams({ initialTab: undefined }); } catch {}
    }
  }, [route?.params]);

  // Load screen on first access (lazy mounting)
  const handleTabPress = (tab: Tab) => {
    console.log('MainTabs.handleTabPress ->', tab, 'loadedScreens before:', Array.from(loadedScreens));
    setActive(tab);
    if (!loadedScreens.has(tab)) {
      setLoadedScreens(prev => new Set([...prev, tab]));
    }
  };

  // Render current screen
  const renderActiveScreen = () => {
    console.log('MainTabs.renderActiveScreen - active:', active, 'loaded:', Array.from(loadedScreens));
    switch (active) {
      case 'Home':
        return <HomeScreen />;
      case 'Lifestyle':
        return loadedScreens.has('Lifestyle') ? <LifestyleScreen /> : (
          <View style={{flex:1,justifyContent:'center',alignItems:'center'}}><Text style={{color:'#999'}}>Loading...</Text></View>
        );
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
        <TabButton label="Lifestyle" icon="🌟" active={active === 'Lifestyle'} onPress={() => handleTabPress('Lifestyle')} />
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
    backgroundColor: '#2011F9',
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
  labelActive: { color: '#2011F9', fontWeight: '600' },
});

export default MainTabs;
