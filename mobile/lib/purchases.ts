import Purchases, { PurchasesOfferings, PurchasesPackage, LOG_LEVEL } from 'react-native-purchases';
import { Platform } from 'react-native';

export type { PurchasesPackage, PurchasesOffering } from 'react-native-purchases';

export const initializePurchases = async (): Promise<void> => {
  const apiKey = Platform.select({
    ios: process.env.EXPO_PUBLIC_REVENUECAT_IOS_API_KEY || '',
    android: process.env.EXPO_PUBLIC_REVENUECAT_ANDROID_API_KEY || '',
  });

  if (!apiKey) {
    console.warn('RevenueCat API key not configured');
    return;
  }

  if (Platform.OS === 'ios') {
    await Purchases.configure({ apiKey });
  } else if (Platform.OS === 'android') {
    await Purchases.configure({ apiKey });
  }

  if (__DEV__) {
    Purchases.setLogLevel(LOG_LEVEL.DEBUG);
  }
};

export const getOfferings = async (): Promise<PurchasesOfferings | null> => {
  try {
    const offerings = await Purchases.getOfferings();
    return offerings;
  } catch (error) {
    console.error('Error fetching offerings:', error);
    return null;
  }
};

export const purchasePackage = async (pkg: PurchasesPackage): Promise<boolean> => {
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
  try {
    const customerInfo = await Purchases.getCustomerInfo();
    return customerInfo.activeSubscriptions.length > 0 || 
           Object.keys(customerInfo.entitlements.active).length > 0;
  } catch (error) {
    console.error('Error checking subscription status:', error);
    return false;
  }
};