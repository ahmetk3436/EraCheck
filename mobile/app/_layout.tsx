import '../global.css';
import '../lib/i18n';  // Import i18n side-effects
import React, { useEffect, useCallback } from 'react';
import { useFonts, PlayfairDisplay_700Bold, PlayfairDisplay_800ExtraBold } from '@expo-google-fonts/playfair-display';
import * as SplashScreen from 'expo-splash-screen';
// Sentry removed - using no-op stub
const Sentry = {
  init: () => {},
  captureException: (e: any) => console.error(e),
  captureMessage: (m: string) => console.warn(m),
  setUser: (_u: any) => {},
  addBreadcrumb: (_b: any) => {},
  withScope: (cb: any) => cb({ setExtra: () => {}, setTag: () => {} }),
  Native: { wrap: (c: any) => c },
  wrap: (c: any) => c,
  ReactNavigationInstrumentation: class {},
  ReactNativeTracing: class {},
};
import { Slot } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { AuthProvider } from '../contexts/AuthContext';
import { ErrorBoundary } from '../components/ErrorBoundary';
import { initLanguage } from '../lib/i18n';
import { refreshApiBaseUrl } from '../lib/api';

Sentry.init({
  dsn: process.env.EXPO_PUBLIC_SENTRY_DSN,
  enabled: !!process.env.EXPO_PUBLIC_SENTRY_DSN,
  tracesSampleRate: __DEV__ ? 1.0 : 0.2,
  environment: __DEV__ ? 'development' : 'production',
});

// Catch unhandled promise rejections
if (!__DEV__) {
  const originalHandler = global.ErrorUtils?.getGlobalHandler?.();
  global.ErrorUtils?.setGlobalHandler?.((error: Error, isFatal?: boolean) => {
    Sentry.captureException(error, { tags: { fatal: String(isFatal) } });
    originalHandler?.(error, isFatal);
  });
}

SplashScreen.preventAutoHideAsync();

function RootLayout() {
  const [fontsLoaded] = useFonts({
    PlayfairDisplay_700Bold,
    PlayfairDisplay_800ExtraBold,
  });

  const onLayoutReady = useCallback(async () => {
    if (fontsLoaded) {
      await SplashScreen.hideAsync();
    }
  }, [fontsLoaded]);

  useEffect(() => {
    refreshApiBaseUrl(); // Update API URL from remote config (non-blocking)
    initLanguage();
  }, []);

  useEffect(() => {
    onLayoutReady();
  }, [onLayoutReady]);

  if (!fontsLoaded) return null;

  return (
    <ErrorBoundary>
      <SafeAreaProvider>
        <AuthProvider>
          <StatusBar style="light" />
          <Slot />
        </AuthProvider>
      </SafeAreaProvider>
    </ErrorBoundary>
  );
}

export default Sentry.wrap(RootLayout);
