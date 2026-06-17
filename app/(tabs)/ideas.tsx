import { useCallback, useState } from 'react';
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
import { IS_DEMO, DEMO_CAPTURES } from '../../constants/demo';
import { Capture, useCaptureStore } from '../../store/captureStore';
import { useUserStore } from '../../store/userStore';
import { toggleActionDone } from '../../services/firestoreService';

type FilterTag = 'all' | 'idea' | 'task' | 'feeling' | 'question';

const TAG_COLORS: Record<string, { bg: string; text: string }> = {
  idea: { bg: 'rgba(74,158,255,0.18)', text: '#4A9EFF' },
  task: { bg: 'rgba(0,201,122,0.18)', text: '#00C97A' },
  feeling: { bg: 'rgba(157,108,255,0.18)', text: '#9D6CFF' },
  question: { bg: 'rgba(255,159,67,0.18)', text: '#FF9F43' },
};

const PRIORITY_COLORS: Record<string, string> = {
  high: Colors.priorityHigh,
  medium: Colors.priorityMedium,
  low: Colors.priorityLow,
};

const FILTERS: { label: string; value: FilterTag }[] = [
  { label: 'All', value: 'all' },
  { label: 'Ideas', value: 'idea' },
  { label: 'Tasks', value: 'task' },
  { label: 'Feelings', value: 'feeling' },
  { label: 'Questions', value: 'question' },
];

interface IdeaCardProps {
  item: Capture;
  onToggleAction: (captureId: string, action: string, markDone: boolean) => void;
}

function IdeaCard({ item, onToggleAction }: IdeaCardProps) {
  const [expanded, setExpanded] = useState(false);
  const [localCompleted, setLocalCompleted] = useState<string[]>(item.completedActions);

  const visibleActions = expanded ? item.actionItems : item.actionItems.slice(0, 2);
  const hasMore = !expanded && item.actionItems.length > 2;

  function handleToggle(action: string) {
    const isDone = localCompleted.includes(action);
    const next = isDone
      ? localCompleted.filter((a) => a !== action)
      : [...localCompleted, action];
    setLocalCompleted(next);
    onToggleAction(item.id, action, !isDone);
  }

  const priorityColor = PRIORITY_COLORS[item.priority] ?? Colors.textMuted;

  return (
    <TouchableOpacity
      style={styles.card}
      onPress={() => setExpanded((e) => !e)}
      activeOpacity={0.85}
      accessibilityRole="button"
      accessibilityLabel={`Idea card. ${expanded ? 'Collapse' : 'Expand'}`}
    >
      {/* Summary or transcript */}
      {item.summary ? (
        <Text style={styles.summary}>{item.summary}</Text>
      ) : (
        <Text style={styles.summaryFallback} numberOfLines={expanded ? undefined : 2}>
          {item.transcript}
        </Text>
      )}

      {/* Tags + priority row */}
      <View style={styles.metaRow}>
        <View style={styles.tags}>
          {item.tags.map((tag) => {
            const colors = TAG_COLORS[tag];
            return (
              <View
                key={tag}
                style={[styles.tagChip, { backgroundColor: colors?.bg ?? Colors.surfaceHigh }]}
              >
                <Text style={[styles.tagText, { color: colors?.text ?? Colors.textSecondary }]}>
                  {tag}
                </Text>
              </View>
            );
          })}
        </View>
        <View style={[styles.priorityBadge, { borderColor: priorityColor }]}>
          <View style={[styles.priorityDot, { backgroundColor: priorityColor }]} />
          <Text style={[styles.priorityText, { color: priorityColor }]}>{item.priority}</Text>
        </View>
      </View>

      {/* Action items */}
      {visibleActions.length > 0 && (
        <View style={styles.actionsBlock}>
          {visibleActions.map((action, idx) => {
            const done = localCompleted.includes(action);
            return (
              <TouchableOpacity
                key={idx}
                style={styles.actionRow}
                onPress={() => handleToggle(action)}
                activeOpacity={0.7}
                accessibilityRole="checkbox"
                accessibilityState={{ checked: done }}
                accessibilityLabel={action}
              >
                <View style={[styles.checkbox, done && styles.checkboxDone]}>
                  {done && <Text style={styles.checkmark}>✓</Text>}
                </View>
                <Text style={[styles.actionText, done && styles.actionTextDone]}>{action}</Text>
              </TouchableOpacity>
            );
          })}
          {hasMore && (
            <Text style={styles.moreActions}>
              +{item.actionItems.length - 2} more…
            </Text>
          )}
        </View>
      )}

      {/* Full transcript when expanded and summary exists */}
      {expanded && item.summary ? (
        <View style={styles.transcriptSection}>
          <Text style={styles.transcriptLabel}>Transcript</Text>
          <Text style={styles.transcriptText}>{item.transcript}</Text>
        </View>
      ) : null}

      {/* Date */}
      <Text style={styles.date}>{formatDate(item.createdAt)}</Text>
    </TouchableOpacity>
  );
}

export default function IdeasScreen() {
  const { captures, updateCapture } = useCaptureStore();
  const { uid } = useUserStore();
  const [filter, setFilter] = useState<FilterTag>('all');

  const items = (IS_DEMO ? DEMO_CAPTURES : captures) as Capture[];
  const filtered =
    filter === 'all' ? items : items.filter((c) => c.tags.includes(filter));
  const sorted = [...filtered].sort((a, b) => b.createdAt - a.createdAt);

  const handleToggleAction = useCallback(
    async (captureId: string, action: string, markDone: boolean) => {
      if (IS_DEMO) return;
      const capture = captures.find((c) => c.id === captureId);
      if (!capture) return;
      const newCompleted = markDone
        ? [...capture.completedActions, action]
        : capture.completedActions.filter((a) => a !== action);
      updateCapture(captureId, { completedActions: newCompleted });
      if (uid) {
        toggleActionDone(uid, captureId, action, markDone).catch(console.error);
      }
    },
    [captures, uid, updateCapture],
  );

  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.header}>
        <Text style={styles.title}>Ideas</Text>
        {IS_DEMO && (
          <View style={styles.demoBadge}>
            <Text style={styles.demoText}>Demo</Text>
          </View>
        )}
      </View>

      {/* Filter bar */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.filterBar}
        style={styles.filterBarScroll}
      >
        {FILTERS.map((f) => (
          <TouchableOpacity
            key={f.value}
            style={[styles.filterPill, filter === f.value && styles.filterPillActive]}
            onPress={() => setFilter(f.value)}
            activeOpacity={0.75}
            accessibilityRole="button"
            accessibilityState={{ selected: filter === f.value }}
          >
            <Text
              style={[
                styles.filterPillText,
                filter === f.value && styles.filterPillTextActive,
              ]}
            >
              {f.label}
            </Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      {sorted.length === 0 ? (
        <View style={styles.empty}>
          <Text style={styles.emptyIcon}>💡</Text>
          <Text style={styles.emptyTitle}>
            {filter === 'all' ? 'No captures yet' : `No ${filter}s yet`}
          </Text>
          <Text style={styles.emptySubtitle}>
            {filter === 'all'
              ? 'Go to the Capture tab and record your first idea.'
              : `No captures tagged as "${filter}" yet.`}
          </Text>
        </View>
      ) : (
        <FlatList
          data={sorted}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.list}
          renderItem={({ item }) => (
            <IdeaCard item={item} onToggleAction={handleToggleAction} />
          )}
        />
      )}
    </SafeAreaView>
  );
}

function formatDate(ts: number): string {
  return new Date(ts).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: Colors.background },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 4,
    paddingBottom: 12,
  },
  title: { color: Colors.text, fontSize: 28, fontWeight: '700' },
  demoBadge: {
    backgroundColor: Colors.surfaceHigh,
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  demoText: { color: Colors.textSecondary, fontSize: 12 },
  filterBarScroll: { maxHeight: 48, flexGrow: 0 },
  filterBar: {
    paddingHorizontal: 16,
    gap: 8,
    alignItems: 'center',
    paddingBottom: 4,
  },
  filterPill: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: Colors.surfaceHigh,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  filterPillActive: {
    backgroundColor: Colors.primary,
    borderColor: Colors.primary,
  },
  filterPillText: { color: Colors.textSecondary, fontSize: 13, fontWeight: '500' },
  filterPillTextActive: { color: Colors.text },
  list: { padding: 16, gap: 12 },
  card: {
    backgroundColor: Colors.surface,
    borderRadius: 14,
    padding: 16,
    borderWidth: 1,
    borderColor: Colors.border,
    gap: 10,
  },
  summary: { color: Colors.text, fontSize: 15, lineHeight: 22, fontWeight: '500' },
  summaryFallback: { color: Colors.text, fontSize: 14, lineHeight: 21 },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    flexWrap: 'wrap',
    gap: 8,
  },
  tags: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, flex: 1 },
  tagChip: {
    borderRadius: 8,
    paddingHorizontal: 9,
    paddingVertical: 3,
  },
  tagText: { fontSize: 11, fontWeight: '600' },
  priorityBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    borderRadius: 8,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderWidth: 1,
  },
  priorityDot: { width: 6, height: 6, borderRadius: 3 },
  priorityText: { fontSize: 11, fontWeight: '600' },
  actionsBlock: { gap: 8, marginTop: 2 },
  actionRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 10 },
  checkbox: {
    width: 20,
    height: 20,
    borderRadius: 6,
    borderWidth: 2,
    borderColor: Colors.border,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 1,
  },
  checkboxDone: {
    backgroundColor: Colors.accent,
    borderColor: Colors.accent,
  },
  checkmark: { color: Colors.background, fontSize: 11, fontWeight: '700' },
  actionText: { color: Colors.textSecondary, fontSize: 13, lineHeight: 20, flex: 1 },
  actionTextDone: { color: Colors.textMuted, textDecorationLine: 'line-through' },
  moreActions: { color: Colors.textMuted, fontSize: 12, marginLeft: 30 },
  transcriptSection: {
    backgroundColor: Colors.surfaceHigh,
    borderRadius: 10,
    padding: 12,
    gap: 6,
    marginTop: 2,
  },
  transcriptLabel: {
    color: Colors.textSecondary,
    fontSize: 10,
    textTransform: 'uppercase',
    letterSpacing: 0.8,
  },
  transcriptText: { color: Colors.textSecondary, fontSize: 13, lineHeight: 20 },
  date: { color: Colors.textMuted, fontSize: 11, marginTop: 2 },
  empty: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 32,
    gap: 12,
  },
  emptyIcon: { fontSize: 56 },
  emptyTitle: { color: Colors.text, fontSize: 20, fontWeight: '700' },
  emptySubtitle: {
    color: Colors.textSecondary,
    fontSize: 15,
    textAlign: 'center',
    lineHeight: 22,
  },
});
