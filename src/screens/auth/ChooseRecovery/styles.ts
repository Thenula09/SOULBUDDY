import { StyleSheet } from 'react-native';

export const chooseStyles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f8f9fa',
    padding: 24,
  },
  title: {
    fontSize: 26,
    fontWeight: '700',
    color: '#1a1a1a',
    marginBottom: 32,
    textAlign: 'center',
  },
  option: {
    width: '100%',
    backgroundColor: '#ffffff',
    paddingVertical: 18,
    paddingHorizontal: 20,
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: '#e1e4e8',
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  optionText: {
    fontSize: 17,
    fontWeight: '600',
    color: '#333333',
    textAlign: 'center',
  },
  linkText: {
    fontSize: 16,
    color: '#007AFF',
    textAlign: 'center',
    marginTop: 24,
    fontWeight: '500',
  },
});
