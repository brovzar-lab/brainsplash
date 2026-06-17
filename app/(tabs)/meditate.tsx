import { useEffect, useRef, useState } from 'react';
import {
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import * as Haptics from 'expo-haptics';
import { Colors } from '../../constants/colors';
import { DEMO_SESSIONS, IS_DEMO } from '../../constants/demo';
import { BreathGuide, BreathPhase } from '../../components/BreathGuide';
import { MeditationTimer } from '../../components/MeditationTimer';
import { Session, useSessionStore } from '../../store/sessionStore';
import { useUserStore } from '../../store/userStore';
import { saveSession } from '../../services/firestoreService';

// ─── Session definitions ─────────────────────────────────────────────────────

interface BreathStep {
  phase: BreathPhase;
  duration: number;
}

interface SessionDef {
  id: string;
  title: string;
  subtitle: string;
  icon: string;
  kind: 'meditation' | 'breathwork';
  totalSeconds: number; // 0 = user-ended (looped breathwork)
  sequence?: BreathStep[];
  loop?: boolean;
  accentColor: string;
}

function buildWimHofSequence(): BreathStep[] {
  const seq: BreathStep[] = [];
  for (let i = 0; i < 30; i++) {
    seq.push({ phase: 'inhale', duration: 2 });
    seq.push({ phase: 'exhale', duration: 2 });
  }
  seq.push({ phase: 'holdOut', duration: 15 });
  seq.push({ phase: 'inhale', duration: 5 });
  seq.push({ phase: 'holdIn', duration: 3 });
  seq.push({ phase: 'exhale', duration: 5 });
  return seq; // 120 + 28 = 148 s total
}

const MEDITATION_SESSIONS: SessionDef[] = [
  {
    id: 'meditation-5',
    title: '5 Min',
    subtitle: 'Quiet',
    icon: '🌑',
    kind: 'meditation',
    totalSeconds: 5 * 60,
    accentColor: Colors.primary,
  },
  {
    id: 'meditation-10',
    title: '10 Min',
    subtitle: 'Quiet',
    icon: '🌒',
    kind: 'meditation',
    totalSeconds: 10 * 60,
    accentColor: Colors.primary,
  },
  {
    id: 'meditation-20',
    title: '20 Min',
    subtitle: 'Quiet',
    icon: '🌕',
    kind: 'meditation',
    totalSeconds: 20 * 60,
    accentColor: Colors.primary,
  },
];

const BREATHWORK_SESSIONS: SessionDef[] = [
  {
    id: 'box',
    title: 'Box Breathing',
    subtitle: '4 — 4 — 4 — 4  ·  loops',
    icon: '⬜',
    kind: 'breathwork',
    totalSeconds: 0,
    loop: true,
    sequence: [
      { phase: 'inhale', duration: 4 },
      { phase: 'holdIn', duration: 4 },
      { phase: 'exhale', duration: 4 },
      { phase: 'holdOut', duration: 4 },
    ],
    accentColor: Colors.accent,
  },
  {
    id: '478',
    title: '4 — 7 — 8',
    subtitle: 'Calm the nervous system  ·  loops',
    icon: '🌙',
    kind: 'breathwork',
    totalSeconds: 0,
    loop: true,
    sequence: [
      { phase: 'inhale', duration: 4 },
      { phase: 'holdIn', duration: 7 },
      { phase: 'exhale', duration: 8 },
    ],
    accentColor: Colors.accentWarm,
  },
  {
    id: 'wim-hof',
    title: 'Wim Hof',
    subtitle: '30 power breaths + retention',
    icon: '❄️',
    kind: 'breathwork',
    totalSeconds: 148,
    loop: false,
    sequence: buildWimHofSequence(),
    accentColor: '#7DD6F5',
  },
];

// ─── Helpers ─────────────────────────────────────────────────────────────────

function computeCurrentPhase(
  elapsed: number,
  sequence: BreathStep[],
  loop: boolean,
): { phase: BreathPhase; phaseDuration: number } {
  const total = sequence.reduce((s, p) => s + p.duration, 0);
  const t = loop ? elapsed % total : Math.min(elapsed, total - 1);
  let acc = 0;
  for (const step of sequence) {
    if (t < acc + step.duration) {
      return { phase: step.phase, phaseDuration: step.duration };
    }
    acc += step.duration;
  }
  const last = sequence[sequence.length - 1];
  return { phase: last.phase, phaseDuration: last.duration };
}

function formatDuration(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  if (m === 0) return `${s}s`;
  if (s === 0) return `${m} min`;
  return `${m}m ${s}s`;
}

function formatElapsed(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = String(seconds % 60).padStart(2, '0');
  return `${String(m).padStart(2, '0')}:${s}`;
}

// ─── Screen ──────────────────────────────────────────────────────────────────

type Mode = 'home' | 'running' | 'complete';

export default function MeditateScreen() {
  const { addSession, sessions } = useSessionStore();
  const { uid } = useUserStore();

  const [mode, setMode] = useState<Mode>('home');
  const [activeDef, setActiveDef] = useState<SessionDef | null>(null);
  const [elapsed, setElapsed] = useState(0);
  const [paused, setPaused] = useState(false);
  const [completedDuration, setCompletedDuration] = useState(0);
  const completedRef = useRef(false);

  // Ticker
  useEffect(() => {
    if (mode !== 'running' || paused) return;
    const id = setInterval(() => setElapsed((e) => e + 1), 1000);
    return () => clearInterval(id);
  }, [mode, paused]);

  // Auto-completion for fixed-duration sessions
  useEffect(() => {
    if (mode !== 'running' || !activeDef) return;
    if (activeDef.totalSeconds > 0 && elapsed >= activeDef.totalSeconds) {
      doComplete(elapsed, activeDef);
    }
  }, [elapsed]);

  function doComplete(duration: number, def: SessionDef) {
    if (completedRef.current) return;
    completedRef.current = true;
    setMode('complete');
    setCompletedDuration(duration);

    if (def.kind === 'meditation') {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => null);
    }

    if (!IS_DEMO) {
      const sid = `${def.id}-${Date.now()}`;
      const sess: Session = {
        id: sid,
        type: def.kind,
        durationSeconds: duration,
        completedAt: Date.now(),
      };
      addSession(sess);
      if (uid) {
        saveSession(uid, sid, { type: def.kind, durationSeconds: duration }).catch(console.error);
      }
    }
  }

  function startSession(def: SessionDef) {
    completedRef.current = false;
    setActiveDef(def);
    setElapsed(0);
    setPaused(false);
    setMode('running');
  }

  function endSession() {
    if (!activeDef) return;
    doComplete(elapsed, activeDef);
  }

  function goHome() {
    setMode('home');
    setActiveDef(null);
    setElapsed(0);
    setPaused(false);
  }

  // ── This week stats ───────────────────────────────────────────────────────

  const weekCutoff = Date.now() - 7 * 86_400_000;
  const allSessions = IS_DEMO ? (DEMO_SESSIONS as Session[]) : sessions;
  const weekSessions = allSessions.filter((s) => s.completedAt >= weekCutoff);
  const weekMinutes = Math.round(
    weekSessions.reduce((sum, s) => sum + s.durationSeconds, 0) / 60,
  );

  // ── Complete screen ───────────────────────────────────────────────────────

  if (mode === 'complete' && activeDef) {
    return (
      <SafeAreaView style={[styles.safe, styles.safeRunning]}>
        <View style={styles.completeScreen}>
          <Text style={styles.completeIcon}>✨</Text>
          <Text style={styles.completeTitle}>Session Complete</Text>
          <Text style={styles.completeDuration}>{formatDuration(completedDuration)}</Text>
          <Text style={styles.completeSessionName}>{activeDef.title}</Text>
          <TouchableOpacity style={styles.doneBtn} onPress={goHome} activeOpacity={0.8}>
            <Text style={styles.doneBtnText}>Done</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  // ── Running screen ────────────────────────────────────────────────────────

  if (mode === 'running' && activeDef) {
    const breathPhase =
      activeDef.sequence
        ? computeCurrentPhase(elapsed, activeDef.sequence, activeDef.loop ?? true)
        : null;
    const remaining = activeDef.totalSeconds > 0 ? activeDef.totalSeconds - elapsed : 0;

    return (
      <SafeAreaView style={[styles.safe, styles.safeRunning]}>
        <View style={styles.runHeader}>
          <Text style={styles.runTitle}>{activeDef.title}</Text>
          <TouchableOpacity style={styles.endBtn} onPress={endSession} activeOpacity={0.7}>
            <Text style={styles.endBtnText}>End</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.runBody}>
          {activeDef.kind === 'meditation' ? (
            <MeditationTimer remainingSeconds={remaining} totalSeconds={activeDef.totalSeconds} />
          ) : (
            breathPhase && (
              <BreathGuide
                phase={breathPhase.phase}
                phaseDuration={breathPhase.phaseDuration}
                running={!paused}
              />
            )
          )}
        </View>

        {activeDef.kind === 'breathwork' && (
          <Text style={styles.elapsedText}>{formatElapsed(elapsed)}</Text>
        )}

        <View style={styles.pauseRow}>
          <TouchableOpacity
            style={[styles.pauseBtn, paused && styles.pauseBtnActive]}
            onPress={() => setPaused((p) => !p)}
            activeOpacity={0.8}
            accessibilityRole="button"
            accessibilityLabel={paused ? 'Resume session' : 'Pause session'}
          >
            <Text style={styles.pauseBtnText}>{paused ? '▶  Resume' : '⏸  Pause'}</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  // ── Home screen ───────────────────────────────────────────────────────────

  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.header}>
        <Text style={styles.title}>Meditate</Text>
      </View>

      <ScrollView
        contentContainerStyle={styles.homeScroll}
        showsVerticalScrollIndicator={false}
      >
        {/* This week */}
        <View style={styles.weekCard}>
          <Text style={styles.weekLabel}>This week</Text>
          <View style={styles.weekStats}>
            <View style={styles.weekStat}>
              <Text style={styles.weekStatNum}>{weekSessions.length}</Text>
              <Text style={styles.weekStatLabel}>sessions</Text>
            </View>
            <View style={styles.weekDivider} />
            <View style={styles.weekStat}>
              <Text style={styles.weekStatNum}>{weekMinutes}</Text>
              <Text style={styles.weekStatLabel}>minutes</Text>
            </View>
          </View>
        </View>

        {/* Quiet sessions */}
        <Text style={styles.sectionTitle}>Quiet Sessions</Text>
        <View style={styles.meditationRow}>
          {MEDITATION_SESSIONS.map((def) => (
            <TouchableOpacity
              key={def.id}
              style={styles.meditationCard}
              onPress={() => startSession(def)}
              activeOpacity={0.8}
              accessibilityRole="button"
              accessibilityLabel={`Start ${def.title} meditation`}
            >
              <Text style={styles.meditationCardIcon}>{def.icon}</Text>
              <Text style={styles.meditationCardTitle}>{def.title}</Text>
              <Text style={styles.meditationCardSub}>{def.subtitle}</Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Breathwork */}
        <Text style={styles.sectionTitle}>Breathwork</Text>
        {BREATHWORK_SESSIONS.map((def) => (
          <TouchableOpacity
            key={def.id}
            style={styles.breathCard}
            onPress={() => startSession(def)}
            activeOpacity={0.8}
            accessibilityRole="button"
            accessibilityLabel={`Start ${def.title}`}
          >
            <View style={styles.breathCardLeft}>
              <Text style={styles.breathCardIcon}>{def.icon}</Text>
              <View>
                <Text style={styles.breathCardTitle}>{def.title}</Text>
                <Text style={styles.breathCardSub}>{def.subtitle}</Text>
              </View>
            </View>
            <Text style={styles.breathCardArrow}>›</Text>
          </TouchableOpacity>
        ))}

        <View style={{ height: 24 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: Colors.background },
  safeRunning: { backgroundColor: '#0E0A22' },
  header: {
    paddingHorizontal: 20,
    paddingTop: 4,
    paddingBottom: 12,
  },
  title: { color: Colors.text, fontSize: 28, fontWeight: '700' },
  homeScroll: { paddingHorizontal: 16, paddingTop: 4 },

  // This week card
  weekCard: {
    backgroundColor: Colors.surface,
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: Colors.border,
    marginBottom: 24,
    gap: 10,
  },
  weekLabel: { color: Colors.textMuted, fontSize: 11, textTransform: 'uppercase', letterSpacing: 1 },
  weekStats: { flexDirection: 'row', alignItems: 'center', gap: 16 },
  weekStat: { alignItems: 'center', gap: 2 },
  weekStatNum: { color: Colors.text, fontSize: 32, fontWeight: '700' },
  weekStatLabel: { color: Colors.textSecondary, fontSize: 12 },
  weekDivider: { width: 1, height: 40, backgroundColor: Colors.border },

  // Section title
  sectionTitle: {
    color: Colors.textSecondary,
    fontSize: 12,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 1,
    marginBottom: 12,
  },

  // Meditation cards row
  meditationRow: { flexDirection: 'row', gap: 10, marginBottom: 28 },
  meditationCard: {
    flex: 1,
    backgroundColor: Colors.surface,
    borderRadius: 14,
    padding: 14,
    alignItems: 'center',
    gap: 6,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  meditationCardIcon: { fontSize: 24 },
  meditationCardTitle: { color: Colors.text, fontSize: 15, fontWeight: '700' },
  meditationCardSub: { color: Colors.textMuted, fontSize: 11 },

  // Breathwork cards
  breathCard: {
    backgroundColor: Colors.surface,
    borderRadius: 14,
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderWidth: 1,
    borderColor: Colors.border,
    marginBottom: 10,
  },
  breathCardLeft: { flexDirection: 'row', alignItems: 'center', gap: 14 },
  breathCardIcon: { fontSize: 24 },
  breathCardTitle: { color: Colors.text, fontSize: 15, fontWeight: '600' },
  breathCardSub: { color: Colors.textMuted, fontSize: 12, marginTop: 2 },
  breathCardArrow: { color: Colors.textMuted, fontSize: 22, fontWeight: '300' },

  // Running screen
  runHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 4,
    paddingBottom: 8,
  },
  runTitle: { color: Colors.textSecondary, fontSize: 16, fontWeight: '500' },
  endBtn: {
    backgroundColor: Colors.surfaceHigh,
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 7,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  endBtnText: { color: Colors.text, fontSize: 14 },
  runBody: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  elapsedText: {
    color: Colors.textMuted,
    fontSize: 16,
    letterSpacing: 2,
    textAlign: 'center',
    marginBottom: 8,
  },
  pauseRow: {
    paddingHorizontal: 40,
    paddingBottom: 32,
    alignItems: 'center',
  },
  pauseBtn: {
    backgroundColor: Colors.surfaceHigh,
    borderRadius: 30,
    paddingHorizontal: 32,
    paddingVertical: 14,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  pauseBtnActive: {
    backgroundColor: Colors.primary,
    borderColor: Colors.primary,
  },
  pauseBtnText: { color: Colors.text, fontSize: 16, fontWeight: '500' },

  // Complete screen
  completeScreen: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
    padding: 32,
  },
  completeIcon: { fontSize: 64, marginBottom: 8 },
  completeTitle: { color: Colors.text, fontSize: 28, fontWeight: '700' },
  completeDuration: {
    color: Colors.primaryLight,
    fontSize: 40,
    fontWeight: '200',
    letterSpacing: 2,
  },
  completeSessionName: { color: Colors.textSecondary, fontSize: 16 },
  doneBtn: {
    backgroundColor: Colors.primary,
    borderRadius: 30,
    paddingHorizontal: 48,
    paddingVertical: 16,
    marginTop: 24,
  },
  doneBtnText: { color: Colors.text, fontSize: 16, fontWeight: '600' },
});
