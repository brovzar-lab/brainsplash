import { useRef, useState } from 'react';
import {
  Dimensions,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Colors } from '../../constants/colors';
import { IS_DEMO } from '../../constants/demo';
import { useUserStore } from '../../store/userStore';

const { width: W } = Dimensions.get('window');

const SLIDES = [
  {
    emoji: '💡',
    title: 'Capture your spark.',
    subtitle: 'Tap record, speak your idea — a fleeting thought, a business plan, a random insight. Nothing gets lost.',
  },
  {
    emoji: '🧠',
    title: 'AI organizes it.',
    subtitle: 'Brain Splash transcribes your voice and surfaces action items, themes, and insights automatically.',
  },
  {
    emoji: '🧘',
    title: 'Then quiet the mind.',
    subtitle: 'After you capture, use the built-in meditation tools to clear mental clutter and recharge.',
  },
] as const;

export default function OnboardingScreen() {
  const router = useRouter();
  const setOnboardingDone = useUserStore((s) => s.setOnboardingDone);
  const setAuthenticated = useUserStore((s) => s.setAuthenticated);
  const [current, setCurrent] = useState(0);
  const scrollRef = useRef<ScrollView>(null);

  function scrollTo(i: number) {
    scrollRef.current?.scrollTo({ x: i * W, animated: true });
    setCurrent(i);
  }

  async function handleNext() {
    if (current < SLIDES.length - 1) {
      scrollTo(current + 1);
    } else {
      finish();
    }
  }

  function finish() {
    setOnboardingDone();
    if (IS_DEMO) {
      setAuthenticated('demo-user', 'demo@brainsplash.app');
      router.replace('/(tabs)');
    } else {
      router.replace('/(auth)/login');
    }
  }

  const isLast = current === SLIDES.length - 1;

  return (
    <SafeAreaView style={styles.safe}>
      {IS_DEMO && (
        <View style={styles.demoBadge}>
          <Text style={styles.demoText}>Demo Mode</Text>
        </View>
      )}
      <ScrollView
        ref={scrollRef}
        horizontal
        pagingEnabled
        scrollEnabled={false}
        showsHorizontalScrollIndicator={false}
        style={{ flex: 1 }}
      >
        {SLIDES.map((s, i) => (
          <View key={i} style={[styles.slide, { width: W }]}>
            <Text style={styles.emoji}>{s.emoji}</Text>
            <Text style={styles.title}>{s.title}</Text>
            <Text style={styles.subtitle}>{s.subtitle}</Text>
          </View>
        ))}
      </ScrollView>

      <View style={styles.footer}>
        <View style={styles.dots}>
          {SLIDES.map((_, i) => (
            <View key={i} style={[styles.dot, i === current && styles.dotActive]} />
          ))}
        </View>

        <TouchableOpacity style={styles.btn} onPress={handleNext} activeOpacity={0.8}>
          <Text style={styles.btnText}>{isLast ? (IS_DEMO ? 'Try Demo' : 'Get Started') : 'Next'}</Text>
        </TouchableOpacity>

        {current > 0 && (
          <TouchableOpacity onPress={() => scrollTo(current - 1)}>
            <Text style={styles.back}>Back</Text>
          </TouchableOpacity>
        )}
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: Colors.background },
  demoBadge: {
    alignSelf: 'center',
    backgroundColor: Colors.surfaceHigh,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 4,
    marginTop: 8,
  },
  demoText: { color: Colors.textSecondary, fontSize: 12 },
  slide: { alignItems: 'center', justifyContent: 'center', paddingHorizontal: 36, gap: 20 },
  emoji: { fontSize: 72 },
  title: {
    color: Colors.text,
    fontSize: 32,
    fontWeight: '700',
    textAlign: 'center',
    lineHeight: 40,
  },
  subtitle: {
    color: Colors.textSecondary,
    fontSize: 17,
    textAlign: 'center',
    lineHeight: 26,
  },
  footer: { padding: 24, gap: 12, alignItems: 'center' },
  dots: { flexDirection: 'row', gap: 8 },
  dot: { width: 8, height: 8, borderRadius: 4, backgroundColor: Colors.border },
  dotActive: { backgroundColor: Colors.primary, width: 24 },
  btn: {
    backgroundColor: Colors.primary,
    borderRadius: 14,
    paddingVertical: 16,
    width: '100%',
    alignItems: 'center',
  },
  btnText: { color: Colors.text, fontSize: 17, fontWeight: '700' },
  back: { color: Colors.textMuted, fontSize: 14, paddingVertical: 4 },
});
