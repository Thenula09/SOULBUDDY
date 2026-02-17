import { StyleSheet } from 'react-native';

export const onboarding2Styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#ffffff',
    paddingHorizontal: 20,
    paddingTop: 50,
    paddingBottom: 30,
  },
  contentContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    maxHeight: '65%',
  },
  animationContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: -30,
  },
  animation: {
    width: 350,
    height: 350,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 8,
    textAlign: 'center',
    color: '#0008ff',
  },
  subtitle: {
    fontSize: 16,
    marginBottom: 20,
    textAlign: 'center',
    color: '#7F8C8D',
    lineHeight: 22,
    paddingHorizontal: 10,
  },
  buttonContainer: {
    width: '100%',
    paddingHorizontal: 40,
    marginTop: 40,
    paddingBottom: 60,
  },
  skipButton: {
    backgroundColor: 'transparent',
    paddingVertical: 12,
    marginBottom: 15,
    width: '100%',
    alignItems: 'center',
  },
  skipButtonText: {
    color: '#95A5A6',
    fontSize: 14,
    fontWeight: '500',
  },
  button: {
    backgroundColor: '#0d00ff',
    width: '100%',
    borderRadius: 999,
    paddingVertical: 14,
    paddingHorizontal: 16,
    marginBottom: 15,
    alignItems: 'center',
    elevation: 3,
    shadowColor: '#0022ff',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
  },
  buttonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },
});