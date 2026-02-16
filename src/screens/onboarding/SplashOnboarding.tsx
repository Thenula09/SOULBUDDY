import React from 'react';
import { View, Text, StyleSheet, Animated, Easing, Dimensions } from 'react-native';
import { OnboardingScreenProps } from '../../types/navigation';

const { width } = Dimensions.get('window');

const SplashOnboarding: React.FC<OnboardingScreenProps> = ({ navigation }) => {
  const fade = React.useRef(new Animated.Value(0)).current;
  const dotAnims = [React.useRef(new Animated.Value(0)).current, React.useRef(new Animated.Value(0)).current, React.useRef(new Animated.Value(0)).current];

  React.useEffect(() => {
    // Fade in title
    Animated.timing(fade, {
      toValue: 1,
      duration: 700,
      useNativeDriver: true,
      easing: Easing.out(Easing.cubic),
    }).start();

    // Dots animation (looping ping)
    const seq = Animated.loop(
      Animated.sequence([
        Animated.stagger(120, dotAnims.map(a => Animated.timing(a, { toValue: 1, duration: 300, useNativeDriver: true }))),
        Animated.delay(200),
        Animated.stagger(80, dotAnims.map(a => Animated.timing(a, { toValue: 0, duration: 200, useNativeDriver: true }))),
        Animated.delay(200),
      ])
    );
    seq.start();

    // Auto navigate to existing onboarding after a short pause
    const t = setTimeout(() => {
      seq.stop();
      navigation.replace('Onboarding1');
    }, 2600);

    return () => {
      clearTimeout(t);
      seq.stop();
    };
  }, [fade, dotAnims, navigation]);

  return (
    <View style={styles.container}>
      {/* subtle blurred-like backdrop using translucent layered gradients */}
      <Animated.View style={[styles.centerContainer, { opacity: fade }]}>
        <Text style={styles.title}>SoulBuddy</Text>
        <Text style={styles.subtitle}>your empathetic companion</Text>

        <View style={styles.dotsRow}>
          {dotAnims.map((a, i) => (
            <Animated.View
              key={i}
              style={[
                styles.dot,
                {
                  transform: [
                    {
                      scale: a.interpolate({ inputRange: [0, 1], outputRange: [0.85, 1.25] }),
                    },
                  ],
                  opacity: a.interpolate({ inputRange: [0, 1], outputRange: [0.35, 1] }),
                },
              ]}
            />
          ))}
        </View>
      </Animated.View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0b1220',
    justifyContent: 'center',
    alignItems: 'center',
  },
  centerContainer: {
    width: '100%',
    alignItems: 'center',
    paddingHorizontal: 24,
  },
  title: {
    color: '#FFFFFF',
    fontSize: 48,
    fontWeight: '800',
    letterSpacing: 2,
    textAlign: 'center',
    textShadowColor: 'rgba(255,255,255,0.08)',
    textShadowOffset: { width: 0, height: 6 },
    textShadowRadius: 20,
    marginBottom: 12,
  },
  subtitle: {
    color: 'rgba(255,255,255,0.72)',
    fontSize: 14,
    marginBottom: 28,
    textAlign: 'center',
  },
  dotsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
  },
  dot: {
    width: Math.min(12, Math.floor(width * 0.02)),
    height: Math.min(12, Math.floor(width * 0.02)),
    borderRadius: 12,
    backgroundColor: '#FFFFFF',
    marginHorizontal: 8,
  },
});

export default SplashOnboarding;
