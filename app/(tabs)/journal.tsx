import { useState } from 'react';
import {
  FlatList,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Colors } from '../../constants/colors';
import { DEMO_CAPTURES, IS_DEMO } from '../../constants/demo';
import { Capture, useCaptureStore } from '../../store/captureStore';

const DAY_ABBR = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

function buildStrip(count: number): Date[] {
  const days: Date[] = [];
  for (let i = 0; i < count; i++) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    d.setHours(0, 0, 0, 0);
    days.push(d);
  }
  return days;
}

function capturesForDay(all: Capture[], day: Date): Capture[] {
  const start = day.getTime();
  const end = start + 86_400_000;
  return all.filter((c) => c.createdAt >= start && c.createdAt < end);
}

function formatTime(ts: number): string {
  return new Date(ts).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
}

function CaptureCard({ item }: { item: Capture }) {
  const [expanded, setExpanded] = useState(false);

  return (
    <TouchableOpacity
      style={styles.card}
      onPress={() => setExpanded((e) => !e)}
      activeOpacity={0.85}
      accessibilityRole="button"
      accessibilityLabel={`Capture at ${formatTime(item.createdAt)}. ${expanded ? 'Collapse' : 'Expand'}`}
    >
      <Text style={styles.cardTime}>{formatTime(item.createdAt)}</Text>

      {item.summary ? (
        <>
          <Text style={styles.summary}>{item.summary}</Text>
          {expanded ? (
            <View style={styles.transcriptBlock}>
              <Text style={styles.transcriptLabel}>Transcript</Text>
              <Text style={styles.transcriptText}>{item.transcript}</Text>
            </View>
          ) : (
            <Text style={styles.snippetText} numberOfLines={2}>{item.transcript}</Text>
          )}
        </>
      ) : (
        <Text style={styles.transcriptText} numberOfLines={expanded ? undefined : 3}>
          {item.transcript}
        </Text>
      )}
    </TouchableOpacity>
  );
}

export default function JournalScreen() {
  const { captures } = useCaptureStore();
  const days = buildStrip(7);
  const [selectedDay, setSelectedDay] = useState<Date>(days[0]);

  const allCaptures = (IS_DEMO ? DEMO_CAPTURES : captures) as Capture[];
  const captureCounts = days.map((d) => capturesForDay(allCaptures, d).length);
  const dayCaptures = capturesForDay(allCaptures, selectedDay).sort(
    (a, b) => b.createdAt - a.createdAt,
  );
  const selectedIsToday = selectedDay.getTime() === days[0].getTime();

  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.header}>
        <Text style={styles.title}>Journal</Text>
        {IS_DEMO && (
          <View style={styles.demoBadge}>
            <Text style={styles.demoText}>Demo</Text>
          </View>
        )}
      </View>

      {/* Date strip */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.dateStrip}
      >
        {days.map((day, i) => {
          const isSelected = day.getTime() === selectedDay.getTime();
          const isToday = i === 0;
          return (
            <TouchableOpacity
              key={day.toISOString()}
              style={[styles.dateCell, isSelected && styles.dateCellSelected]}
              onPress={() => setSelectedDay(day)}
              activeOpacity={0.7}
              accessibilityRole="button"
              accessibilityState={{ selected: isSelected }}
              accessibilityLabel={`${isToday ? 'Today' : DAY_ABBR[day.getDay()]} ${day.getDate()}, ${captureCounts[i]} captures`}
            >
              <Text style={[styles.dateDayLabel, isSelected && styles.dateDayLabelSelected]}>
                {isToday ? 'Today' : DAY_ABBR[day.getDay()]}
              </Text>
              <Text style={[styles.dateDayNum, isSelected && styles.dateDayNumSelected]}>
                {day.getDate()}
              </Text>
              <View style={[styles.dot, captureCounts[i] > 0 ? styles.dotVisible : styles.dotHidden, isSelected && styles.dotSelected]} />
            </TouchableOpacity>
          );
        })}
      </ScrollView>

      {/* Day heading */}
      <View style={styles.dayRow}>
        <Text style={styles.dayHeading}>
          {selectedIsToday
            ? 'Today'
            : selectedDay.toLocaleDateString('en-US', {
                weekday: 'long',
                month: 'long',
                day: 'numeric',
              })}
        </Text>
        {dayCaptures.length > 0 && (
          <Text style={styles.dayCount}>
            {dayCaptures.length} {dayCaptures.length === 1 ? 'capture' : 'captures'}
          </Text>
        )}
      </View>

      {dayCaptures.length === 0 ? (
        <View style={styles.empty}>
          <Text style={styles.emptyIcon}>📭</Text>
          <Text style={styles.emptyTitle}>No captures on this day</Text>
          <Text style={styles.emptySubtitle}>
            Head to the Capture tab and record a voice idea to see it here.
          </Text>
        </View>
      ) : (
        <FlatList
          data={dayCaptures}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.list}
          renderItem={({ item }) => <CaptureCard item={item} />}
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: Colors.background },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 4,
    paddingBottom: 8,
  },
  title: { color: Colors.text, fontSize: 28, fontWeight: '700' },
  demoBadge: {
    backgroundColor: Colors.surfaceHigh,
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  demoText: { color: Colors.textSecondary, fontSize: 12 },
  dateStrip: { paddingHorizontal: 16, paddingBottom: 8, gap: 8 },
  dateCell: {
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 14,
    minWidth: 60,
    gap: 3,
    backgroundColor: Colors.surface,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  dateCellSelected: {
    backgroundColor: Colors.primary,
    borderColor: Colors.primary,
  },
  dateDayLabel: { color: Colors.textMuted, fontSize: 10, fontWeight: '600', letterSpacing: 0.5 },
  dateDayLabelSelected: { color: 'rgba(255,255,255,0.85)' },
  dateDayNum: { color: Colors.text, fontSize: 20, fontWeight: '700' },
  dateDayNumSelected: { color: Colors.text },
  dot: { width: 5, height: 5, borderRadius: 2.5 },
  dotVisible: { backgroundColor: Colors.accent },
  dotHidden: { backgroundColor: 'transparent' },
  dotSelected: { backgroundColor: 'rgba(255,255,255,0.6)' },
  dayRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'baseline',
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 6,
  },
  dayHeading: { color: Colors.text, fontSize: 18, fontWeight: '700' },
  dayCount: { color: Colors.textMuted, fontSize: 13 },
  list: { padding: 16, gap: 12 },
  card: {
    backgroundColor: Colors.surface,
    borderRadius: 14,
    padding: 16,
    borderWidth: 1,
    borderColor: Colors.border,
    gap: 8,
  },
  cardTime: { color: Colors.textMuted, fontSize: 11 },
  summary: { color: Colors.text, fontSize: 15, lineHeight: 22, fontWeight: '500' },
  transcriptBlock: {
    backgroundColor: Colors.surfaceHigh,
    borderRadius: 10,
    padding: 12,
    gap: 6,
  },
  transcriptLabel: {
    color: Colors.textSecondary,
    fontSize: 10,
    textTransform: 'uppercase',
    letterSpacing: 0.8,
  },
  transcriptText: { color: Colors.textSecondary, fontSize: 13, lineHeight: 20 },
  snippetText: { color: Colors.textMuted, fontSize: 12, lineHeight: 18 },
  empty: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 32,
    gap: 12,
  },
  emptyIcon: { fontSize: 52 },
  emptyTitle: { color: Colors.text, fontSize: 20, fontWeight: '700' },
  emptySubtitle: {
    color: Colors.textSecondary,
    fontSize: 15,
    textAlign: 'center',
    lineHeight: 22,
    maxWidth: 280,
  },
});
