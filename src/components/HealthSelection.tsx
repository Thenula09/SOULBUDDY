import React, { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';

const HealthIssuesData = [
  { id: '1', name: 'Diabetes (දියවැඩියාව)' },
  { id: '2', name: 'High Blood Pressure (අධික රුධිර පීඩනය)' },
  { id: '3', name: 'Asthma (ඇදුම)' },
  { id: '4', name: 'Gastritis (ගැස්ට්‍රයිටිස්)' },
  { id: '5', name: 'Cholesterol (කොලෙස්ටරෝල්)' },
  { id: '6', name: 'Migraine (ඉරුවාරදය)' },
  { id: '7', name: 'Anxiety (කාංසාව)' },
  { id: '8', name: 'Thyroid Issues (තයිරොයිඩ්)' },
  { id: '9', name: 'Heart Disease (හෘද රෝග)' },
  { id: '10', name: 'Kidney Disease (වකුගඩු රෝග)' },
];

type Props = {
  onSelectIssues: (issues: string[]) => void;
  selected?: string[];
};

export default function HealthSelection({ onSelectIssues, selected = [] }: Props) {
  const [selectedIssues, setSelectedIssues] = useState<string[]>(selected);

  useEffect(() => {
    // keep internal state in sync if `selected` prop changes
    setSelectedIssues(selected);
  }, [selected]);

  const toggleSelection = (name: string) => {
    let updatedList = [...selectedIssues];
    if (updatedList.includes(name)) {
      updatedList = updatedList.filter(item => item !== name);
    } else {
      updatedList.push(name);
    }
    setSelectedIssues(updatedList);
    onSelectIssues(updatedList);
  };

  return (
    <View style={styles.container}>
      <Text style={styles.label}>Select Health Conditions (ඕනෑම ගණනක්):</Text>
      <View style={styles.listContainer}>
        {HealthIssuesData.map((item) => (
          <TouchableOpacity 
            key={item.id} 
            style={[
              styles.chip, 
              selectedIssues.includes(item.name) && styles.selectedChip
            ]}
            onPress={() => toggleSelection(item.name)}
          >
            <Text style={[
              styles.chipText, 
              selectedIssues.includes(item.name) && styles.selectedChipText
            ]}>
              {item.name}
            </Text>
          </TouchableOpacity>
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { marginTop: 15 },
  label: { fontSize: 16, fontWeight: 'bold', marginBottom: 10 },
  listContainer: { flexDirection: 'row', flexWrap: 'wrap' },
  chip: {
    padding: 10,
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 20,
    margin: 5,
    backgroundColor: '#fff'
  },
  selectedChip: { backgroundColor: '#007bff', borderColor: '#007bff' },
  chipText: { color: '#333' },
  selectedChipText: { color: '#fff', fontWeight: 'bold' }
});
