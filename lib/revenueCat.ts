import Purchases from 'react-native-purchases';
import { IS_DEMO } from '../constants/demo';

export const ENTITLEMENT_PREMIUM = 'premium';
export const OFFERING_DEFAULT = 'default';

export function configurePurchases() {
  if (IS_DEMO) return;

  const apiKey = process.env.EXPO_PUBLIC_REVENUECAT_API_KEY ?? '';
  if (!apiKey || apiKey === 'REPLACE_WITH_VALUE') return;

  Purchases.configure({ apiKey, appUserID: null });
}

export async function checkIsPremium(): Promise<boolean> {
  if (IS_DEMO) return false;
  try {
    const info = await Purchases.getCustomerInfo();
    return Object.keys(info.entitlements.active).length > 0;
  } catch {
    return false;
  }
}
