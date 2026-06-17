import { useEffect } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import Animated, {
  Easing,
  cancelAnimation,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';
import { Colors } from '../constants/colors';

export type BreathPhase = 'inhale' | 'holdIn' | 'exhale' | 'holdOut';

const PHASE_LABELS: Record<BreathPhase, string> = {
  inhale: 'Inhale',
  holdIn: 'Hold',
  exhale: 'Exhale',
  holdOut: 'Hold',
};

const CIRCLE_MAX = 200;

interface Props {
  phase: BreathPhase;
  phaseDuration: number;
  running: boolean;
}

export function BreathGuide({ phase, phaseDuration, running }: Props) {
  const scale = useSharedValue(0.5);

  useEffect(() => {
    if (!running) {
      cancelAnimation(scale);
      return;
    }
    const ms = phaseDuration * 1000;
    if (phase === 'inhale') {
      scale.value = withTiming(1.0, { duration: ms, easing: Easing.inOut(Easing.ease) });
    } else if (phase === 'exhale') {
      scale.value = withTiming(0.5, { duration: ms, easing: Easing.inOut(Easing.ease) });
    }
    // holdIn / holdOut: keep current scale — no animation needed
  }, [phase, running]);

  const animStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
    opacity: 0.35 + scale.value * 0.65,
  }));

  return (
    <View style={styles.container}>
      <View style={styles.wrapper}>
        <Animated.View style={[styles.circle, animStyle]} />
      </View>
      <Text style={styles.label}>{PHASE_LABELS[phase]}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { alignItems: 'center', gap: 32 },
  wrapper: {
    width: CIRCLE_MAX,
    height: CIRCLE_MAX,
    alignItems: 'center',
    justifyContent: 'center',
  },
  circle: {
    width: CIRCLE_MAX,
    height: CIRCLE_MAX,
    borderRadius: CIRCLE_MAX / 2,
    backgroundColor: Colors.primary,
    shadowColor: Colors.primary,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.8,
    shadowRadius: 40,
    elevation: 12,
  },
  label: {
    color: Colors.text,
    fontSize: 20,
    fontWeight: '300',
    letterSpacing: 6,
    textTransform: 'uppercase',
  },
});
