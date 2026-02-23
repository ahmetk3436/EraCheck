import React, { useEffect, useRef } from 'react';
import { View, Text, Animated } from 'react-native';
import { router } from 'expo-router';
import { useSubscription } from '../../contexts/SubscriptionContext';

// RevenueCat UI — paywall is fully managed from RevenueCat dashboard
let RevenueCatUI: any = null;
let PAYWALL_RESULT: any = { PURCHASED: 'PURCHASED', RESTORED: 'RESTORED', NOT_PRESENTED: 'NOT_PRESENTED', ERROR: 'ERROR', CANCELLED: 'CANCELLED' };
try {
  const mod = require('react-native-purchases-ui');
  RevenueCatUI = mod.default ?? mod;
  if (mod.PAYWALL_RESULT) PAYWALL_RESULT = mod.PAYWALL_RESULT;
} catch {
  // react-native-purchases-ui not available (Expo Go / dev)
}

function SnackbarAndBack() {
  const opacity = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.sequence([
      Animated.timing(opacity, { toValue: 1, duration: 200, useNativeDriver: true }),
      Animated.delay(1200),
      Animated.timing(opacity, { toValue: 0, duration: 300, useNativeDriver: true }),
    ]).start(() => router.back());
  }, []);

  return (
    <View style={{ flex: 1, backgroundColor: 'transparent' }}>
      <Animated.View
        style={{
          opacity,
          position: 'absolute',
          bottom: 48,
          left: 24,
          right: 24,
          backgroundColor: '#1f1f1f',
          borderRadius: 12,
          paddingVertical: 14,
          paddingHorizontal: 20,
          shadowColor: '#000',
          shadowOffset: { width: 0, height: 4 },
          shadowOpacity: 0.3,
          shadowRadius: 8,
          elevation: 6,
        }}
      >
        <Text style={{ color: '#fff', fontSize: 14, textAlign: 'center' }}>
          Paywall not available for now
        </Text>
      </Animated.View>
    </View>
  );
}

export default function PaywallScreen() {
  const { checkSubscription } = useSubscription();

  const handleDismiss = () => router.back();

  const handlePurchaseCompleted = async () => {
    await checkSubscription();
    router.back();
  };

  if (!RevenueCatUI) {
    return <SnackbarAndBack />;
  }

  return (
    <RevenueCatUI.Paywall
      onDismiss={handleDismiss}
      onPurchaseCompleted={handlePurchaseCompleted}
      onRestoreCompleted={handlePurchaseCompleted}
      onPurchaseError={() => router.back()}
      onRestoreError={() => router.back()}
    />
  );
}