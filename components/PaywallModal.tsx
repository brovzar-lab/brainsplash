import { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Modal,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import Purchases, { type PurchasesPackage } from 'react-native-purchases';
import { Colors } from '../constants/colors';
import { IS_DEMO } from '../constants/demo';
import { OFFERING_DEFAULT } from '../lib/revenueCat';
import { useUserStore } from '../store/userStore';

interface Props {
  visible: boolean;
  onClose(): void;
}

export function PaywallModal({ visible, onClose }: Props) {
  const [pkg, setPkg] = useState<PurchasesPackage | null>(null);
  const [loading, setLoading] = useState(false);
  const setTier = useUserStore((s) => s.setTier);

  useEffect(() => {
    if (!visible || IS_DEMO) return;
    Purchases.getOfferings()
      .then((o) => {
        const p = o.all[OFFERING_DEFAULT]?.availablePackages[0];
        if (p) setPkg(p);
      })
      .catch(console.error);
  }, [visible]);

  async function handlePurchase() {
    if (IS_DEMO || !pkg) return;
    setLoading(true);
    try {
      await Purchases.purchasePackage(pkg);
      setTier('premium');
      onClose();
    } catch {
      // user cancelled or error
    } finally {
      setLoading(false);
    }
  }

  async function handleRestore() {
    if (IS_DEMO) return;
    setLoading(true);
    try {
      const info = await Purchases.restorePurchases();
      if (Object.keys(info.entitlements.active).length > 0) {
        setTier('premium');
        onClose();
      }
    } catch {
      // ignore
    } finally {
      setLoading(false);
    }
  }

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet" onRequestClose={onClose}>
      <View style={styles.container}>
        <View style={styles.handle} />
        <Text style={styles.emoji}>💡</Text>
        <Text style={styles.title}>Brain Splash Premium</Text>
        <Text style={styles.subtitle}>
          Free: 20 voice captures per month.{'\n'}
          Upgrade for unlimited captures and AI insights.
        </Text>

        <View style={styles.features}>
          {[
            'Unlimited voice captures',
            'AI weekly insight digest',
            'Full capture history',
            'Priority support',
          ].map((f) => (
            <View key={f} style={styles.featureRow}>
              <Text style={styles.featureCheck}>✓</Text>
              <Text style={styles.featureText}>{f}</Text>
            </View>
          ))}
        </View>

        <View style={styles.pricing}>
          <TouchableOpacity
            style={[styles.cta, styles.ctaPrimary]}
            onPress={IS_DEMO ? onClose : handlePurchase}
            disabled={loading || (!IS_DEMO && !pkg)}
            activeOpacity={0.8}
          >
            {loading ? (
              <ActivityIndicator color={Colors.background} />
            ) : (
              <>
                <Text style={styles.ctaPrimaryText}>
                  {IS_DEMO ? 'Demo — $4.99/mo' : pkg ? `${pkg.product.priceString}/mo` : 'Loading…'}
                </Text>
                <Text style={styles.ctaSubText}>Cancel anytime</Text>
              </>
            )}
          </TouchableOpacity>

          <TouchableOpacity style={styles.ctaSecondary} onPress={IS_DEMO ? onClose : handlePurchase} activeOpacity={0.8}>
            <Text style={styles.ctaSecondaryText}>
              {IS_DEMO ? '$44.99/yr · Demo' : '$44.99 / year · Save 25%'}
            </Text>
          </TouchableOpacity>
        </View>

        {IS_DEMO && (
          <View style={styles.demoBadge}>
            <Text style={styles.demoText}>Demo mode — purchases disabled</Text>
          </View>
        )}

        <TouchableOpacity onPress={IS_DEMO ? onClose : handleRestore} style={styles.restore}>
          <Text style={styles.restoreText}>{IS_DEMO ? 'Close' : 'Restore Purchase'}</Text>
        </TouchableOpacity>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
    padding: 24,
    alignItems: 'center',
  },
  handle: {
    width: 40,
    height: 4,
    backgroundColor: Colors.border,
    borderRadius: 2,
    marginBottom: 28,
    alignSelf: 'center',
  },
  emoji: { fontSize: 52, marginBottom: 12 },
  title: {
    color: Colors.text,
    fontSize: 26,
    fontWeight: '700',
    marginBottom: 8,
    textAlign: 'center',
  },
  subtitle: {
    color: Colors.textSecondary,
    fontSize: 15,
    textAlign: 'center',
    marginBottom: 24,
    lineHeight: 22,
  },
  features: { width: '100%', marginBottom: 28 },
  featureRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 10, gap: 12 },
  featureCheck: { color: Colors.accent, fontSize: 16, fontWeight: '700' },
  featureText: { color: Colors.text, fontSize: 15 },
  pricing: { width: '100%', gap: 10, marginBottom: 16 },
  cta: {
    borderRadius: 14,
    paddingVertical: 16,
    paddingHorizontal: 24,
    width: '100%',
    alignItems: 'center',
  },
  ctaPrimary: { backgroundColor: Colors.primary },
  ctaPrimaryText: { color: Colors.text, fontSize: 17, fontWeight: '700' },
  ctaSubText: { color: Colors.primaryLight, fontSize: 12, marginTop: 2 },
  ctaSecondary: {
    backgroundColor: Colors.surfaceHigh,
    borderRadius: 14,
    paddingVertical: 14,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: Colors.border,
  },
  ctaSecondaryText: { color: Colors.textSecondary, fontSize: 15, fontWeight: '600' },
  demoBadge: {
    backgroundColor: Colors.surfaceHigh,
    borderRadius: 10,
    padding: 10,
    width: '100%',
    alignItems: 'center',
    marginBottom: 12,
  },
  demoText: { color: Colors.textSecondary, fontSize: 13 },
  restore: { padding: 8, marginTop: 4 },
  restoreText: { color: Colors.textMuted, fontSize: 13 },
});
