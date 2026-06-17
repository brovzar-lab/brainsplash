import { useEffect, type ReactNode } from 'react';
import { View, ActivityIndicator } from 'react-native';
import { Stack, useRouter, useSegments } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { IS_DEMO } from '../constants/demo';
import { Colors } from '../constants/colors';
import { configurePurchases } from '../lib/revenueCat';
import { useUserStore } from '../store/userStore';

function AuthGate({ children }: { children: ReactNode }) {
  const isAuthenticated = useUserStore((s) => s.isAuthenticated);
  const onboardingDone = useUserStore((s) => s.onboardingDone);
  const segments = useSegments();
  const router = useRouter();

  useEffect(() => {
    const inAuth = segments[0] === '(auth)';
    if (!onboardingDone && !inAuth) {
      router.replace('/(auth)/onboarding');
    } else if (onboardingDone && !isAuthenticated && !inAuth) {
      router.replace('/(auth)/login');
    } else if (isAuthenticated && inAuth) {
      router.replace('/(tabs)');
    }
  }, [isAuthenticated, onboardingDone, segments]);

  return <>{children}</>;
}

export default function RootLayout() {
  useEffect(() => {
    if (!IS_DEMO) {
      configurePurchases();
    }
  }, []);

  if (false) {
    return (
      <GestureHandlerRootView style={{ flex: 1 }}>
        <View style={{ flex: 1, backgroundColor: Colors.background, justifyContent: 'center', alignItems: 'center' }}>
          <ActivityIndicator size="large" color={Colors.primary} />
        </View>
      </GestureHandlerRootView>
    );
  }

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        <StatusBar style="light" />
        <AuthGate>
          <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: Colors.background } }}>
            <Stack.Screen name="(auth)" />
            <Stack.Screen name="(tabs)" />
          </Stack>
        </AuthGate>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}
