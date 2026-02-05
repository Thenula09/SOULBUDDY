import { StyleSheet } from 'react-native';

export const profileStyles = StyleSheet.create({
  fullContainer: { flex: 1, backgroundColor: 'transparent' },
  svgBackground: { position: 'absolute', top: 0, left: 0, right: 0 },
  container: { flex: 1, backgroundColor: 'transparent' },
  contentContainer: { paddingHorizontal: 20, paddingTop: 20, paddingBottom: 60 },
  
  // Photo centered over SVG
  photoContainer: { alignItems: 'center', marginBottom: 10, marginTop: 90 },
  photoCircle: { marginBottom: 12 },
  photoText: { color: '#636363', fontSize: 14, textAlign: 'center', fontWeight: '500' },
  
  header: { fontSize: 24, fontWeight: 'bold', marginBottom: 20, textAlign: 'center', color: '#0051ff' },

  // Avatar
  avatar: { width: 96, height: 96, borderRadius: 48 },
  avatarPlaceholder: { backgroundColor: '#007AFF', alignItems: 'center', justifyContent: 'center', borderWidth: 2, borderColor: '#fff' },
  avatarText: { color: '#fff', fontWeight: '600' },

  // Labels & inputs
  label: { marginTop: 12, marginBottom: 6, color: '#333', fontWeight: '600', fontSize: 14 },
  smallLabel: { fontSize: 12, color: '#666', marginBottom: 4 },
  input: { borderWidth: 0, borderRadius: 12, padding: 14, backgroundColor: 'rgba(255,255,255,0.9)', fontSize: 15, shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.1, shadowRadius: 2, elevation: 2 },

  // Row helpers
  rowCenter: { flexDirection: 'row', alignItems: 'center' },
  rowWithGap: { flexDirection: 'row', alignItems: 'center' },
  rowMarginBottom: { flexDirection: 'row', marginBottom: 8 },
  rowInput: { flex: 1, marginRight: 8 },
  wrapRow: { flexDirection: 'row', flexWrap: 'wrap', marginTop: 8 },

  // Chips
  hobbyChip: { flexDirection: 'row', alignItems: 'center', padding: 10, backgroundColor: 'rgba(255,255,255,0.9)', borderRadius: 20, marginRight: 8, marginBottom: 8, shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.1, shadowRadius: 2, elevation: 2 },
  chipText: { color: '#333', fontWeight: '500' },
  removeText: { marginLeft: 8, color: '#FF3B30', fontWeight: 'bold' },

  // Buttons
  addBtn: { paddingHorizontal: 16, paddingVertical: 12, borderRadius: 12, borderWidth: 0, backgroundColor: '#007AFF', alignItems: 'center', justifyContent: 'center', shadowColor: '#007AFF', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.3, shadowRadius: 4, elevation: 3 },
  addBtnText: { color: '#fff', fontWeight: '600' },
  smallBtn: { padding: 10, borderRadius: 12, borderWidth: 0, backgroundColor: 'rgba(255,255,255,0.9)', marginRight: 8, shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.1, shadowRadius: 2, elevation: 2 },
  smallBtnActive: { backgroundColor: '#007AFF', borderColor: '#007AFF' },
  smallBtnText: { fontWeight: '600', fontSize: 14 },
  smallBtnTextActive: { color: '#fff' },
  smallBtnTextInactive: { color: '#333' },

  // Save
  saveBtn: { marginTop: 24, backgroundColor: '#007AFF', padding: 16, borderRadius: 12, alignItems: 'center', shadowColor: '#007AFF', shadowOffset: { width: 0, height: 3 }, shadowOpacity: 0.4, shadowRadius: 6, elevation: 4 },
  saveBtnText: { color: '#fff', fontWeight: 'bold', fontSize: 16 },

  // Picker & songs
  pickerBg: { backgroundColor: 'rgba(255,255,255,0.9)', borderRadius: 12, marginTop: 5, borderWidth: 0, shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.1, shadowRadius: 2, elevation: 2 },
  songList: { marginTop: 8 },
  songRow: { justifyContent: 'space-between', width: '100%' },
  songText: { color: '#333', flex: 1 },

  // Lifestyle
  lifestyleRow: { marginBottom: 8 },
  lifestyleInputContainer: { flex: 1, marginRight: 8 },
  lifestyleInputContainer2: { flex: 1 },
});
