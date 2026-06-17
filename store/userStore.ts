import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';

interface UserState {
  isAuthenticated: boolean;
  uid: string | null;
  email: string | null;
  tier: 'free' | 'premium';
  onboardingDone: boolean;
  setAuthenticated(uid: string, email: string | null): void;
  setUnauthenticated(): void;
  setTier(tier: 'free' | 'premium'): void;
  setOnboardingDone(): void;
}

export const useUserStore = create<UserState>()(
  persist(
    (set) => ({
      isAuthenticated: false,
      uid: null,
      email: null,
      tier: 'free',
      onboardingDone: false,
      setAuthenticated(uid, email) {
        set({ isAuthenticated: true, uid, email });
      },
      setUnauthenticated() {
        set({ isAuthenticated: false, uid: null, email: null });
      },
      setTier(tier) {
        set({ tier });
      },
      setOnboardingDone() {
        set({ onboardingDone: true });
      },
    }),
    {
      name: 'brainsplash-user',
      storage: createJSONStorage(() => AsyncStorage),
    },
  ),
);
