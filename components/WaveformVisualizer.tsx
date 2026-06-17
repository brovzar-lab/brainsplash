import { useEffect, useRef } from 'react';
import { Animated, StyleSheet, View } from 'react-native';
import { Colors } from '../constants/colors';

const BAR_COUNT = 24;

interface Props {
  isRecording: boolean;
}

export function WaveformVisualizer({ isRecording }: Props) {
  const anims = useRef(
    Array.from({ length: BAR_COUNT }, () => new Animated.Value(0.12)),
  ).current;

  useEffect(() => {
    if (!isRecording) {
      anims.forEach((a) => Animated.spring(a, { toValue: 0.12, useNativeDriver: true }).start());
      return;
    }

    const loops = anims.map((anim, i) => {
      const delay = (i * 50) % 500;
      return Animated.loop(
        Animated.sequence([
          Animated.delay(delay),
          Animated.timing(anim, {
            toValue: 0.15 + Math.random() * 0.85,
            duration: 280 + Math.floor(Math.random() * 220),
            useNativeDriver: true,
          }),
          Animated.timing(anim, {
            toValue: 0.1 + Math.random() * 0.35,
            duration: 280 + Math.floor(Math.random() * 220),
            useNativeDriver: true,
          }),
        ]),
      );
    });

    loops.forEach((l) => l.start());
    return () => loops.forEach((l) => l.stop());
  }, [isRecording, anims]);

  return (
    <View style={styles.container}>
      {anims.map((anim, i) => (
        <Animated.View
          key={i}
          style={[
            styles.bar,
            {
              transform: [{ scaleY: anim }],
              backgroundColor: isRecording ? Colors.recordingRed : Colors.primary,
              opacity: isRecording ? 1 : 0.35,
            },
          ]}
        />
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    height: 64,
  },
  bar: {
    width: 4,
    height: 64,
    borderRadius: 2,
  },
});
