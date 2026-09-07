import { Platform } from 'react-native';
import Purchases, { LOG_LEVEL, PurchasesPackage } from 'react-native-purchases';

export const PREMIUM_ENTITLEMENT = 'premium';

let configured = false;

export function configurePurchases(): boolean {
  if (Platform.OS !== 'android') return false;
  const apiKey = process.env.EXPO_PUBLIC_REVENUECAT_ANDROID_API_KEY;
  if (!apiKey || apiKey.includes('replace_me')) return false;
  if (!configured) {
    Purchases.setLogLevel(__DEV__ ? LOG_LEVEL.DEBUG : LOG_LEVEL.INFO);
    Purchases.configure({ apiKey });
    configured = true;
  }
  return true;
}

export async function hasPremiumEntitlement(): Promise<boolean> {
  if (!configurePurchases()) return false;
  const info = await Purchases.getCustomerInfo();
  return Boolean(info.entitlements.active[PREMIUM_ENTITLEMENT]);
}

export async function getPremiumPackage(): Promise<PurchasesPackage | null> {
  if (!configurePurchases()) return null;
  const offerings = await Purchases.getOfferings();
  return offerings.current?.availablePackages[0] ?? null;
}

export async function buyPremium(item: PurchasesPackage): Promise<boolean> {
  const { customerInfo } = await Purchases.purchasePackage(item);
  return Boolean(customerInfo.entitlements.active[PREMIUM_ENTITLEMENT]);
}

export async function restorePremium(): Promise<boolean> {
  if (!configurePurchases()) return false;
  const info = await Purchases.restorePurchases();
  return Boolean(info.entitlements.active[PREMIUM_ENTITLEMENT]);
}
