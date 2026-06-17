import { useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Animated,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import * as Haptics from 'expo-haptics';
import { Colors } from '../../constants/colors';
import { IS_DEMO, DEMO_ACTIVE_TRANSCRIPT } from '../../constants/demo';
import { WaveformVisualizer } from '../../components/WaveformVisualizer';
import { PaywallModal } from '../../components/PaywallModal';
import { startRecording, stopRecording, requestMicPermission } from '../../services/audio';
import { transcribeAudio } from '../../services/whisper';
import { extractFromTranscript, ExtractionResult, IdeaTag, IdeaPriority } from '../../services/claude';
import { uploadAudio, saveCapture, updateCaptureExtraction } from '../../services/firestoreService';
import { useCaptureStore, FREE_CAPTURE_LIMIT } from '../../store/captureStore';
import { useUserStore } from '../../store/userStore';

type Stage = 'idle' | 'recording' | 'transcribing' | 'extracting' | 'done' | 'error';

const MAX_RECORD_SECONDS = 120;

export default function CaptureScreen() {
  const { addCapture, incrementMonthlyCount, getMonthlyCount } = useCaptureStore();
  const { tier, uid } = useUserStore();

  const [stage, setStage] = useState<Stage>('idle');
  const [elapsed, setElapsed] = useState(0);
  const [transcript, setTranscript] = useState('');
  const [extractionResult, setExtractionResult] = useState<ExtractionResult | null>(null);
  const [showPaywall, setShowPaywall] = useState(false);
  const [toastVisible, setToastVisible] = useState(false);

  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const pulseAnim = useRef(new Animated.Value(1)).current;
  const pulseLoop = useRef<Animated.CompositeAnimation | null>(null);
  const toastOpacity = useRef(new Animated.Value(0)).current;

  const hitLimit = !IS_DEMO && tier === 'free' && getMonthlyCount() >= FREE_CAPTURE_LIMIT;
  const isRecording = stage === 'recording';
  const isTranscribing = stage === 'transcribing';
  const isExtracting = stage === 'extracting';
  const isProcessing = isTranscribing || isExtracting;
  const remaining = MAX_RECORD_SECONDS - elapsed;

  useEffect(() => {
    if (isRecording) {
      timerRef.current = setInterval(() => {
        setElapsed((e) => {
          if (e + 1 >= MAX_RECORD_SECONDS) {
            void handleStop();
            return e;
          }
          return e + 1;
        });
      }, 1000);

      pulseLoop.current = Animated.loop(
        Animated.sequence([
          Animated.timing(pulseAnim, { toValue: 1.1, duration: 700, useNativeDriver: true }),
          Animated.timing(pulseAnim, { toValue: 1, duration: 700, useNativeDriver: true }),
        ]),
      );
      pulseLoop.current.start();

      return () => {
        if (timerRef.current) clearInterval(timerRef.current);
        pulseLoop.current?.stop();
        pulseAnim.setValue(1);
      };
    } else {
      if (timerRef.current) clearInterval(timerRef.current);
      setElapsed(0);
    }
  }, [isRecording]);

  function showDemoToast() {
    setToastVisible(true);
    toastOpacity.setValue(0);
    Animated.sequence([
      Animated.timing(toastOpacity, { toValue: 1, duration: 200, useNativeDriver: true }),
      Animated.delay(1800),
      Animated.timing(toastOpacity, { toValue: 0, duration: 400, useNativeDriver: true }),
    ]).start(() => setToastVisible(false));
  }

  async function handleRecord() {
    if (hitLimit) {
      setShowPaywall(true);
      return;
    }
    if (IS_DEMO) {
      await runDemoFlow();
      return;
    }
    const granted = await requestMicPermission();
    if (!granted) {
      Alert.alert('Permission required', 'Microphone access is needed to capture your ideas.');
      return;
    }
    setStage('recording');
    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    await startRecording();
  }

  async function handleStop() {
    if (timerRef.current) clearInterval(timerRef.current);
    setStage('transcribing');
    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);

    if (IS_DEMO) return;

    const uri = await stopRecording();
    if (!uri) {
      setStage('idle');
      return;
    }

    try {
      const captureId = `cap-${Date.now()}`;
      const currentUid = uid ?? 'anon';

      const [audioUrl, rawTranscript] = await Promise.all([
        uploadAudio(currentUid, captureId, uri),
        transcribeAudio(uri),
      ]);

      setTranscript(rawTranscript);

      // Save raw capture immediately so it's not lost if Claude fails
      saveCapture(currentUid, captureId, { audioUrl, transcript: rawTranscript }).catch(console.error);

      setStage('extracting');
      const extraction = await extractFromTranscript(rawTranscript);
      setExtractionResult(extraction);

      // Update Firestore doc with AI extraction
      updateCaptureExtraction(currentUid, captureId, extraction).catch(console.error);

      addCapture({
        id: captureId,
        audioUrl,
        transcript: rawTranscript,
        summary: extraction.summary,
        actionItems: extraction.actionItems,
        tags: extraction.tags,
        priority: extraction.priority,
        createdAt: Date.now(),
        completedActions: [],
      });
      incrementMonthlyCount();

      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      setStage('done');
    } catch (err) {
      console.error('Capture failed:', err);
      Alert.alert('Error', 'Could not process your capture. Please try again.');
      setStage('error');
    }
  }

  async function runDemoFlow() {
    setStage('recording');
    await new Promise((r) => setTimeout(r, 2500));

    setStage('transcribing');
    await new Promise((r) => setTimeout(r, 1200));

    setStage('extracting');
    await new Promise((r) => setTimeout(r, 900));

    const demoExtraction: ExtractionResult = {
      summary: 'Onboarding flow feedback — lead with outcome, not features.',
      actionItems: ['Redesign slide 2 with before/after emotional hook', 'A/B test new copy with the team'],
      tags: ['idea', 'task'] as IdeaTag[],
      priority: 'high' as IdeaPriority,
    };

    setTranscript(DEMO_ACTIVE_TRANSCRIPT);
    setExtractionResult(demoExtraction);

    await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    setStage('done');
    showDemoToast();
  }

  function resetCapture() {
    setStage('idle');
    setTranscript('');
    setExtractionResult(null);
  }

  function formatTime(s: number) {
    const m = Math.floor(s / 60);
    const sec = s % 60;
    return `${m}:${sec.toString().padStart(2, '0')}`;
  }

  const hintText: Record<Stage, string> = {
    idle: 'Tap the button and speak your idea. No structure needed — just talk.',
    recording: 'Recording… tap again to stop.',
    transcribing: 'Transcribing your voice with Whisper…',
    extracting: 'Extracting insights with AI…',
    done: '✓ Captured! Find it in the Ideas tab.',
    error: 'Something went wrong. Tap to try again.',
  };

  const showRecordButton = stage !== 'transcribing' && stage !== 'extracting';

  return (
    <SafeAreaView style={styles.safe}>
      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        <View style={styles.header}>
          <Text style={styles.title}>Capture</Text>
          {IS_DEMO && (
            <View style={styles.demoBadge}>
              <Text style={styles.demoText}>Demo</Text>
            </View>
          )}
        </View>

        <Text style={styles.hint}>{hintText[stage]}</Text>

        <View style={styles.waveContainer}>
          <WaveformVisualizer isRecording={isRecording} />
        </View>

        {isRecording && (
          <View style={styles.timerRow}>
            <View style={styles.recDot} />
            <Text style={styles.timerText}>{formatTime(elapsed)}</Text>
            <Text style={styles.timerRemaining}>{formatTime(remaining)} left</Text>
          </View>
        )}

        {isProcessing && (
          <View style={styles.processingRow}>
            <ActivityIndicator color={Colors.primary} />
            <Text style={styles.processingText}>
              {isTranscribing ? 'Transcribing with Whisper…' : 'Extracting insights with AI…'}
            </Text>
          </View>
        )}

        {stage === 'done' && extractionResult && (
          <View style={styles.resultCard}>
            {extractionResult.summary ? (
              <>
                <Text style={styles.resultLabel}>AI Summary</Text>
                <Text style={styles.resultSummary}>{extractionResult.summary}</Text>
                {extractionResult.actionItems.length > 0 && (
                  <>
                    <Text style={[styles.resultLabel, { marginTop: 12 }]}>Actions</Text>
                    {extractionResult.actionItems.slice(0, 3).map((action, i) => (
                      <View key={i} style={styles.resultActionRow}>
                        <View style={styles.resultDot} />
                        <Text style={styles.resultActionText}>{action}</Text>
                      </View>
                    ))}
                  </>
                )}
              </>
            ) : (
              <>
                <Text style={styles.resultLabel}>Transcript</Text>
                <Text style={styles.resultSummary}>{transcript}</Text>
              </>
            )}
          </View>
        )}

        {showRecordButton && (
          <>
            {stage === 'done' ? (
              <View style={styles.doneActions}>
                <TouchableOpacity style={styles.anotherBtn} onPress={resetCapture} activeOpacity={0.8}>
                  <Text style={styles.anotherBtnText}>Capture Another</Text>
                </TouchableOpacity>
              </View>
            ) : (
              <Animated.View style={{ transform: [{ scale: pulseAnim }] }}>
                <TouchableOpacity
                  style={[styles.btn, isRecording && styles.btnStop, stage === 'error' && styles.btnError]}
                  onPress={isRecording ? handleStop : handleRecord}
                  activeOpacity={0.85}
                  accessibilityLabel={isRecording ? 'Stop recording' : 'Start recording'}
                  accessibilityRole="button"
                >
                  <Text style={styles.btnIcon}>{isRecording ? '⏹' : '🎙️'}</Text>
                  <Text style={styles.btnText}>
                    {isRecording ? 'Stop' : hitLimit ? 'Upgrade' : stage === 'error' ? 'Try Again' : 'Capture'}
                  </Text>
                </TouchableOpacity>
              </Animated.View>
            )}
          </>
        )}

        {!IS_DEMO && tier === 'free' && (
          <Text style={styles.limitText}>
            {getMonthlyCount()}/{FREE_CAPTURE_LIMIT} free captures used this month
          </Text>
        )}
      </ScrollView>

      {toastVisible && (
        <Animated.View style={[styles.toast, { opacity: toastOpacity }]}>
          <Text style={styles.toastText}>Demo mode — not saved</Text>
        </Animated.View>
      )}

      <PaywallModal visible={showPaywall} onClose={() => setShowPaywall(false)} />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: Colors.background },
  scroll: { padding: 20, paddingBottom: 40, alignItems: 'center' },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    width: '100%',
    marginBottom: 12,
  },
  title: { color: Colors.text, fontSize: 28, fontWeight: '700' },
  demoBadge: {
    backgroundColor: Colors.surfaceHigh,
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  demoText: { color: Colors.textSecondary, fontSize: 12 },
  hint: {
    color: Colors.textSecondary,
    fontSize: 15,
    textAlign: 'center',
    marginBottom: 32,
    lineHeight: 22,
    width: '100%',
  },
  waveContainer: { marginBottom: 24, alignItems: 'center' },
  timerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 20,
  },
  recDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: Colors.recordingRed,
  },
  timerText: { color: Colors.text, fontSize: 18, fontWeight: '600', fontVariant: ['tabular-nums'] },
  timerRemaining: { color: Colors.textMuted, fontSize: 13 },
  processingRow: { flexDirection: 'row', alignItems: 'center', gap: 12, marginVertical: 16 },
  processingText: { color: Colors.textSecondary, fontSize: 15 },
  resultCard: {
    backgroundColor: Colors.surface,
    borderRadius: 14,
    padding: 16,
    width: '100%',
    marginBottom: 24,
    borderWidth: 1,
    borderColor: Colors.border,
    gap: 4,
  },
  resultLabel: {
    color: Colors.textSecondary,
    fontSize: 11,
    marginBottom: 4,
    textTransform: 'uppercase',
    letterSpacing: 0.8,
  },
  resultSummary: { color: Colors.text, fontSize: 15, lineHeight: 22 },
  resultActionRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 8, marginTop: 4 },
  resultDot: {
    width: 5,
    height: 5,
    borderRadius: 3,
    backgroundColor: Colors.primary,
    marginTop: 8,
  },
  resultActionText: { color: Colors.textSecondary, fontSize: 13, lineHeight: 20, flex: 1 },
  doneActions: { alignItems: 'center', width: '100%', marginTop: 8 },
  anotherBtn: {
    backgroundColor: Colors.surfaceHigh,
    borderRadius: 14,
    paddingVertical: 14,
    paddingHorizontal: 32,
    borderWidth: 1,
    borderColor: Colors.primary,
  },
  anotherBtnText: { color: Colors.primaryLight, fontSize: 15, fontWeight: '600' },
  btn: {
    backgroundColor: Colors.primary,
    borderRadius: 88,
    width: 172,
    height: 172,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    shadowColor: Colors.primary,
    shadowOpacity: 0.5,
    shadowRadius: 28,
    shadowOffset: { width: 0, height: 12 },
    elevation: 12,
  },
  btnStop: {
    backgroundColor: Colors.recordingRed,
    shadowColor: Colors.recordingRed,
  },
  btnError: {
    backgroundColor: Colors.error,
    shadowColor: Colors.error,
  },
  btnIcon: { fontSize: 44 },
  btnText: { color: Colors.text, fontSize: 14, fontWeight: '700', textAlign: 'center' },
  limitText: { color: Colors.textMuted, fontSize: 12, marginTop: 24 },
  toast: {
    position: 'absolute',
    bottom: 48,
    alignSelf: 'center',
    backgroundColor: 'rgba(30,30,50,0.92)',
    borderRadius: 20,
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  toastText: { color: Colors.textSecondary, fontSize: 14 },
});
