import { StyleSheet } from 'react-native';

export const resetStyles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 24,
    justifyContent: 'center',
    backgroundColor: '#f8f9fa',
  },
  title: { fontSize: 26, fontWeight: '700', textAlign: 'center', marginBottom: 8 },
  subtitle: { fontSize: 14, color: '#6c757d', textAlign: 'center', marginBottom: 20 },
  input: {
    width: '100%',
    height: 52,
    backgroundColor: '#fff',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#e6e6e6',
    paddingHorizontal: 14,
    marginBottom: 12,
  },
  button: {
    width: '100%',
    height: 56,
    backgroundColor: '#0066FF',
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 8,
  },
  buttonText: { color: '#fff', fontSize: 16, fontWeight: '600' },
  linkText: { textAlign: 'center', marginTop: 12, color: '#0037ff', fontWeight: '500' },
});
