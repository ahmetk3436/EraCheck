import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
} from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import api, { authApi, setOnAuthFailed } from '../lib/api';
import {
  setTokens,
  clearTokens,
  getAccessToken,
  getRefreshToken,
} from '../lib/storage';
import { hapticSuccess, hapticError } from '../lib/haptics';
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
import type { User, AuthResponse } from '../types/auth';

const GUEST_MODE_KEY = 'eracheck_guest_mode';
const GUEST_USAGE_KEY = 'eracheck_guest_usage';
const MAX_GUEST_USES = 3;

interface AuthContextType {
  isAuthenticated: boolean;
  isLoading: boolean;
  isGuest: boolean;
  guestUsageCount: number;
  user: User | null;
  login: (email: string, password: string) => Promise<void>;
  register: (email: string, password: string) => Promise<void>;
  loginWithApple: (identityToken: string, authCode: string, fullName?: string, email?: string) => Promise<void>;
  logout: () => Promise<void>;
  deleteAccount: (password?: string) => Promise<void>;
  continueAsGuest: () => Promise<void>;
  canUseFeature: () => boolean;
  incrementGuestUsage: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isGuest, setIsGuest] = useState(false);
  const [guestUsageCount, setGuestUsageCount] = useState(0);

  const isAuthenticated = user !== null;

  // Restore session on mount
  useEffect(() => {
    const restore = async () => {
      try {
        // Check guest mode
        const guestMode = await AsyncStorage.getItem(GUEST_MODE_KEY);
        const guestUsage = await AsyncStorage.getItem(GUEST_USAGE_KEY);

        if (guestMode === 'true') {
          setIsGuest(true);
          setGuestUsageCount(guestUsage ? parseInt(guestUsage, 10) : 0);
        }

        const token = await getAccessToken();
        if (token) {
          const { data } = await authApi.get('/auth/me');
          setUser({
            id: data.id,
            email: data.email,
            isAppleUser: data.is_apple_user || data.isAppleUser || false,
          });
          // If user is authenticated, clear guest mode
          setIsGuest(false);
        }
      } catch {
        await clearTokens();
      } finally {
        setIsLoading(false);
      }
    };
    restore();
  }, []);

  const login = useCallback(async (email: string, password: string) => {
    try {
      const { data } = await authApi.post<AuthResponse>('/auth/login', {
        email,
        password,
      });
      await setTokens(data.access_token, data.refresh_token);
      setUser({ ...data.user, isAppleUser: false });
      Sentry.setUser({ id: data.user.id, email: data.user.email });
      // Clear guest mode on login
      setIsGuest(false);
      await AsyncStorage.removeItem(GUEST_MODE_KEY);
      await AsyncStorage.removeItem(GUEST_USAGE_KEY);
      setGuestUsageCount(0);
      hapticSuccess();
    } catch (err) {
      hapticError();
      throw err;
    }
  }, []);

  const register = useCallback(async (email: string, password: string) => {
    try {
      const { data } = await authApi.post<AuthResponse>('/auth/register', {
        email,
        password,
      });
      await setTokens(data.access_token, data.refresh_token);
      setUser({ ...data.user, isAppleUser: false });
      Sentry.setUser({ id: data.user.id, email: data.user.email });
      // Clear guest mode on register
      setIsGuest(false);
      await AsyncStorage.removeItem(GUEST_MODE_KEY);
      await AsyncStorage.removeItem(GUEST_USAGE_KEY);
      setGuestUsageCount(0);
      hapticSuccess();
    } catch (err) {
      hapticError();
      throw err;
    }
  }, []);

  // Sign in with Apple (Guideline 4.8)
  const loginWithApple = useCallback(
    async (identityToken: string, authCode: string, fullName?: string, email?: string) => {
      try {
        const { data } = await authApi.post<AuthResponse>('/auth/apple', {
          identity_token: identityToken,
          authorization_code: authCode,
          full_name: fullName,
          email,
        });
        await setTokens(data.access_token, data.refresh_token);
        setUser({ ...data.user, isAppleUser: true });
        Sentry.setUser({ id: data.user.id, email: data.user.email });
        setIsGuest(false);
        await AsyncStorage.removeItem(GUEST_MODE_KEY);
        await AsyncStorage.removeItem(GUEST_USAGE_KEY);
        setGuestUsageCount(0);
        hapticSuccess();
      } catch (err) {
        hapticError();
        throw err;
      }
    },
    []
  );

  const logout = useCallback(async () => {
    try {
      const refreshToken = await getRefreshToken();
      if (refreshToken) {
        await authApi.post('/auth/logout', { refresh_token: refreshToken });
      }
    } catch {
      // Ignore logout API errors
    } finally {
      await clearTokens();
      setUser(null);
      Sentry.setUser(null);
      setIsGuest(false);
      await AsyncStorage.removeItem(GUEST_MODE_KEY);
      await AsyncStorage.removeItem(GUEST_USAGE_KEY);
      setGuestUsageCount(0);
    }
  }, []);

  // Register logout callback for token refresh failures
  useEffect(() => {
    setOnAuthFailed(() => logout);
    return () => setOnAuthFailed(null);
  }, [logout]);

  // Account deletion (Guideline 5.1.1)
  const deleteAccount = useCallback(
    async (password?: string) => {
      try {
        await authApi.delete('/auth/account', {
          data: { password: password || '' },
        });
        await clearTokens();
        setUser(null);
        setIsGuest(false);
        await AsyncStorage.removeItem(GUEST_MODE_KEY);
        await AsyncStorage.removeItem(GUEST_USAGE_KEY);
        setGuestUsageCount(0);
      } catch (err) {
        throw err;
      }
    },
    []
  );

  const continueAsGuest = useCallback(async () => {
    await AsyncStorage.setItem(GUEST_MODE_KEY, 'true');
    await AsyncStorage.setItem(GUEST_USAGE_KEY, '0');
    setIsGuest(true);
    setGuestUsageCount(0);
    hapticSuccess();
  }, []);

  const canUseFeature = useCallback(() => {
    if (isAuthenticated) return true;
    return guestUsageCount < MAX_GUEST_USES;
  }, [isAuthenticated, guestUsageCount]);

  const incrementGuestUsage = useCallback(async () => {
    if (isAuthenticated) return;
    const newCount = guestUsageCount + 1;
    setGuestUsageCount(newCount);
    await AsyncStorage.setItem(GUEST_USAGE_KEY, newCount.toString());
  }, [isAuthenticated, guestUsageCount]);

  return (
    <AuthContext.Provider
      value={{
        isAuthenticated,
        isLoading,
        isGuest,
        guestUsageCount,
        user,
        login,
        register,
        loginWithApple,
        logout,
        deleteAccount,
        continueAsGuest,
        canUseFeature,
        incrementGuestUsage,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}