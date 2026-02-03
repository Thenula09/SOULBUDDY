import React from 'react';
import { View, Text, StyleSheet } from 'react-native';

const LifestylesScreen = () => {
  return (
    <View style={styles.container}>
      <Text style={styles.title}>Lifestyles</Text>
      <Text style={styles.text}>Track your daily habits and lifestyle insights here.</Text>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 20 },
  title: { fontSize: 22, fontWeight: 'bold', marginBottom: 10 },
  text: { fontSize: 16, color: '#666', textAlign: 'center' },
});

export default LifestylesScreen;
