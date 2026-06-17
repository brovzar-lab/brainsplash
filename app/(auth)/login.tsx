import { useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { signInWithEmailAndPassword } from 'firebase/auth';
import { Colors } from '../../constants/colors';
import { IS_DEMO } from '../../constants/demo';
import { auth } from '../../lib/firebase';
import { useUserStore } from '../../store/userStore';

export default function LoginScreen() {
  const router = useRouter();
  const setAuthenticated = useUserStore((s) => s.setAuthenticated);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);

  async function handleSignIn() {
    if (!email || !password) return;
    setLoading(true);
    try {
      const cred = await signInWithEmailAndPassword(auth, email, password);
      setAuthenticated(cred.user.uid, cred.user.email);
      router.replace('/(tabs)');
    } catch (err: unknown) {
      Alert.alert('Sign in failed', err instanceof Error ? err.message : 'Please try again.');
    } finally {
      setLoading(false);
    }
  }

  function handleDemo() {
    setAuthenticated('demo-user', 'demo@brainsplash.app');
    router.replace('/(tabs)');
  }

  return (
    <SafeAreaView style={styles.safe}>
      {IS_DEMO && (
        <View style={styles.demoBadge}>
          <Text style={styles.demoText}>Demo Mode</Text>
        </View>
      )}
      <View style={styles.content}>
        <Text style={styles.logo}>💡</Text>
        <Text style={styles.title}>Brain Splash</Text>
        <Text style={styles.subtitle}>Capture every spark before it fades</Text>

        {IS_DEMO ? (
          <TouchableOpacity style={styles.demoBtn} onPress={handleDemo} activeOpacity={0.8}>
            <Text style={styles.demoBtnText}>Continue as Demo User</Text>
          </TouchableOpacity>
        ) : (
          <>
            <TextInput
              style={styles.input}
              placeholder="Email"
              placeholderTextColor={Colors.textMuted}
              value={email}
              onChangeText={setEmail}
              keyboardType="email-address"
              autoCapitalize="none"
            />
            <TextInput
              style={styles.input}
              placeholder="Password"
              placeholderTextColor={Colors.textMuted}
              value={password}
              onChangeText={setPassword}
              secureTextEntry
            />
            <TouchableOpacity
              style={styles.btn}
              onPress={handleSignIn}
              disabled={loading}
              activeOpacity={0.8}
            >
              {loading ? (
                <ActivityIndicator color={Colors.text} />
              ) : (
                <Text style={styles.btnText}>Sign In</Text>
              )}
            </TouchableOpacity>
            <TouchableOpacity onPress={() => router.push('/(auth)/signup')} style={styles.toggle}>
              <Text style={styles.toggleText}>Don&apos;t have an account? Sign up</Text>
            </TouchableOpacity>
          </>
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
  content: { flex: 1, padding: 24, justifyContent: 'center', gap: 12 },
  logo: { fontSize: 60, textAlign: 'center', marginBottom: 4 },
  title: { color: Colors.text, fontSize: 32, fontWeight: '700', textAlign: 'center' },
  subtitle: { color: Colors.textSecondary, fontSize: 16, textAlign: 'center', marginBottom: 20 },
  input: {
    backgroundColor: Colors.surface,
    borderRadius: 12,
    padding: 16,
    color: Colors.text,
    fontSize: 15,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  btn: {
    backgroundColor: Colors.primary,
    borderRadius: 14,
    paddingVertical: 16,
    alignItems: 'center',
    marginTop: 8,
  },
  btnText: { color: Colors.text, fontSize: 16, fontWeight: '700' },
  demoBtn: {
    backgroundColor: Colors.surfaceHigh,
    borderRadius: 14,
    paddingVertical: 16,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: Colors.primary,
  },
  demoBtnText: { color: Colors.primaryLight, fontSize: 16, fontWeight: '600' },
  toggle: { alignItems: 'center', marginTop: 4 },
  toggleText: { color: Colors.textSecondary, fontSize: 14 },
});
