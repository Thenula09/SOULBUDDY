import { StyleSheet } from 'react-native';

export const chooseStyles = StyleSheet.create({
  wrapper: {
    flex: 1,
    position: 'relative',
  },
  svgBackground: {
    position: 'absolute',
    top: -40, // raise SVG similar to Login/Forgot screens
    left: 0,
    right: 0,
    bottom: 0,
    width: '100%',
    height: '100%',
    zIndex: 0,
  },
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'transparent',
    padding: 24,
    zIndex: 1,
  },
  title: {
    fontSize: 36,
    fontWeight: '700',
    color: '#ffffff',
    marginTop: -90,
    marginBottom: 192,
    textAlign: 'center',
  },
  option: {
    width: '100%',
    borderRadius: 999,
    paddingVertical: 14,
    paddingHorizontal: 16,
    marginTop: 16,
    backgroundColor: '#0028c7', // match Login primary button
    borderWidth: 0,
    alignItems: 'center',
    marginBottom: 16,
    shadowColor: '#c9d2f1',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.12,
    shadowRadius: 18,
    elevation: 6,
  },
  optionText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#ffffff',
    textAlign: 'center',
  },
  linkText: {
    fontSize: 16,
    color: '#0017e8',
    textAlign: 'center',
    marginTop: 24,
    fontWeight: '500',
  },
});
