import { StyleSheet, Text, View } from 'react-native';
import { Colors } from '../constants/colors';

interface Props {
  remainingSeconds: number;
  totalSeconds: number;
}

function pad(n: number): string {
  return String(Math.max(0, Math.floor(n))).padStart(2, '0');
}

export function MeditationTimer({ remainingSeconds, totalSeconds }: Props) {
  const clamped = Math.max(0, remainingSeconds);
  const minutes = Math.floor(clamped / 60);
  const seconds = clamped % 60;
  const progress = totalSeconds > 0 ? 1 - clamped / totalSeconds : 0;

  return (
    <View style={styles.container}>
      <Text style={styles.time}>
        {pad(minutes)}:{pad(seconds)}
      </Text>
      <View style={styles.track}>
        <View style={[styles.fill, { width: `${Math.min(progress * 100, 100)}%` as `${number}%` }]} />
      </View>
      <Text style={styles.hint}>remaining</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { alignItems: 'center', gap: 16 },
  time: {
    color: Colors.text,
    fontSize: 80,
    fontWeight: '100',
    letterSpacing: 4,
  },
  track: {
    width: 200,
    height: 2,
    backgroundColor: 'rgba(255,255,255,0.15)',
    borderRadius: 1,
    overflow: 'hidden',
  },
  fill: {
    height: '100%',
    backgroundColor: Colors.primaryLight,
    borderRadius: 1,
  },
  hint: {
    color: Colors.textMuted,
    fontSize: 13,
    letterSpacing: 2,
    textTransform: 'uppercase',
  },
});
