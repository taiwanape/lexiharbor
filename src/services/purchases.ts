import { Platform } from 'react-native';
import type { PurchasesPackage } from 'react-native-purchases';

export const PREMIUM_ENTITLEMENT = 'premium';

let configured = false;

async function getPurchases() {
  if (Platform.OS !== 'android') return null;
  const apiKey = process.env.EXPO_PUBLIC_REVENUECAT_ANDROID_API_KEY;
  if (!apiKey || apiKey.includes('replace_me')) return null;
  const { default: Purchases, LOG_LEVEL } = await import('react-native-purchases');
  if (!configured) {
    Purchases.setLogLevel(__DEV__ ? LOG_LEVEL.DEBUG : LOG_LEVEL.INFO);
    Purchases.configure({ apiKey });
    configured = true;
  }
  return Purchases;
}

export async function hasPremiumEntitlement(): Promise<boolean> {
  const Purchases = await getPurchases();
  if (!Purchases) return false;
  const info = await Purchases.getCustomerInfo();
  return Boolean(info.entitlements.active[PREMIUM_ENTITLEMENT]);
}

export async function getPremiumPackage(): Promise<PurchasesPackage | null> {
  const Purchases = await getPurchases();
  if (!Purchases) return null;
  const offerings = await Purchases.getOfferings();
  return offerings.current?.availablePackages[0] ?? null;
}

export async function buyPremium(item: PurchasesPackage): Promise<boolean> {
  const Purchases = await getPurchases();
  if (!Purchases) return false;
  const { customerInfo } = await Purchases.purchasePackage(item);
  return Boolean(customerInfo.entitlements.active[PREMIUM_ENTITLEMENT]);
}

export async function restorePremium(): Promise<boolean> {
  const Purchases = await getPurchases();
  if (!Purchases) return false;
  const info = await Purchases.restorePurchases();
  return Boolean(info.entitlements.active[PREMIUM_ENTITLEMENT]);
}
