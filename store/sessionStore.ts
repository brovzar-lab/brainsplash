import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';

export interface Session {
  id: string;
  type: 'meditation' | 'breathwork';
  durationSeconds: number;
  completedAt: number;
}

interface SessionState {
  sessions: Session[];
  addSession(session: Session): void;
}

export const useSessionStore = create<SessionState>()(
  persist(
    (set) => ({
      sessions: [],
      addSession(session) {
        set((s) => ({ sessions: [session, ...s.sessions] }));
      },
    }),
    {
      name: 'brainsplash-sessions',
      storage: createJSONStorage(() => AsyncStorage),
    },
  ),
);
