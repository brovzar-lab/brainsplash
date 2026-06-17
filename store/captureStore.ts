import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';

export interface Capture {
  id: string;
  audioUrl: string;
  transcript: string;
  summary: string;
  actionItems: string[];
  tags: string[];
  priority: 'high' | 'medium' | 'low';
  createdAt: number;
  completedActions: string[];
}

export const FREE_CAPTURE_LIMIT = 20;

interface CaptureState {
  captures: Capture[];
  monthlyCaptureCount: number;
  monthKey: string;
  addCapture(capture: Capture): void;
  updateCapture(id: string, partial: Partial<Capture>): void;
  incrementMonthlyCount(): void;
  getMonthlyCount(): number;
}

function currentMonthKey(): string {
  const d = new Date();
  return `${d.getFullYear()}-${d.getMonth()}`;
}

export const useCaptureStore = create<CaptureState>()(
  persist(
    (set, get) => ({
      captures: [],
      monthlyCaptureCount: 0,
      monthKey: currentMonthKey(),
      addCapture(capture) {
        set((s) => ({ captures: [capture, ...s.captures] }));
      },
      updateCapture(id, partial) {
        set((s) => ({
          captures: s.captures.map((c) => (c.id === id ? { ...c, ...partial } : c)),
        }));
      },
      incrementMonthlyCount() {
        const key = currentMonthKey();
        set((s) => ({
          monthlyCaptureCount: s.monthKey === key ? s.monthlyCaptureCount + 1 : 1,
          monthKey: key,
        }));
      },
      getMonthlyCount() {
        const key = currentMonthKey();
        const s = get();
        return s.monthKey === key ? s.monthlyCaptureCount : 0;
      },
    }),
    {
      name: 'brainsplash-captures',
      storage: createJSONStorage(() => AsyncStorage),
    },
  ),
);
