import Purchases, { PurchasesOfferings, PurchasesPackage, LOG_LEVEL } from 'react-native-purchases';
import { Platform } from 'react-native';

export type { PurchasesPackage, PurchasesOffering } from 'react-native-purchases';

let isConfigured = false;

export const initializePurchases = async (): Promise<void> => {
  if (isConfigured) return;

  const apiKey = Platform.select({
    ios: process.env.EXPO_PUBLIC_REVENUECAT_IOS_API_KEY || '',
    android: process.env.EXPO_PUBLIC_REVENUECAT_ANDROID_API_KEY || '',
  });

  if (!apiKey) {
    console.warn('RevenueCat API key not configured — purchases disabled');
    return;
  }

  try {
    await Purchases.configure({ apiKey });
    isConfigured = true;
    if (__DEV__) {
      Purchases.setLogLevel(LOG_LEVEL.DEBUG);
    }
  } catch (error) {
    console.warn('RevenueCat configure failed:', error);
  }
};

export const getOfferings = async (): Promise<PurchasesOfferings | null> => {
  if (!isConfigured) return null;
  try {
    return await Purchases.getOfferings();
  } catch (error) {
    console.error('Error fetching offerings:', error);
    return null;
  }
};

export const purchasePackage = async (pkg: PurchasesPackage): Promise<boolean> => {
  if (!isConfigured) return false;
  try {
    const { customerInfo } = await Purchases.purchasePackage(pkg);
    return customerInfo.activeSubscriptions.length > 0 ||
           Object.keys(customerInfo.entitlements.active).length > 0;
  } catch (error: any) {
    if (!error.userCancelled) {
      console.error('Error purchasing package:', error);
    }
    return false;
  }
};

export const restorePurchases = async (): Promise<boolean> => {
  if (!isConfigured) return false;
  try {
    const customerInfo = await Purchases.restorePurchases();
    return customerInfo.activeSubscriptions.length > 0 ||
           Object.keys(customerInfo.entitlements.active).length > 0;
  } catch (error) {
    console.error('Error restoring purchases:', error);
    return false;
  }
};

export const checkSubscriptionStatus = async (): Promise<boolean> => {
  if (!isConfigured) return false;
  try {
    const customerInfo = await Purchases.getCustomerInfo();
    return customerInfo.activeSubscriptions.length > 0 ||
           Object.keys(customerInfo.entitlements.active).length > 0;
  } catch (error) {
    console.error('Error checking subscription status:', error);
    return false;
  }
};