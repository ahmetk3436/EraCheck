import { useState, useEffect, useCallback, useRef } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { hapticWarning } from './haptics';

const NETWORK_STATUS_KEY = '@eracheck_network_status';
const CHECK_INTERVAL_MS = 30000;
const CACHE_VALIDITY_MS = 5 * 60 * 1000;

interface NetworkStatus {
  online: boolean;
  timestamp: number;
}

interface UseNetworkStatusReturn {
  isOnline: boolean;
  isChecking: boolean;
  checkNow: () => Promise<boolean>;
}

export function useNetworkStatus(): UseNetworkStatusReturn {
  const [isOnline, setIsOnline] = useState<boolean>(true);
  const [isChecking, setIsChecking] = useState<boolean>(false);
  const lastOnlineState = useRef<boolean>(true);
  const checkIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const isMounted = useRef<boolean>(true);

  const checkNetworkStatus = useCallback(async (): Promise<boolean> => {
    if (!isMounted.current) return lastOnlineState.current;

    setIsChecking(true);

    try {
      const apiUrl = process.env.EXPO_PUBLIC_API_URL || 'http://localhost:8080/api';
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 5000);

      const response = await fetch(`${apiUrl}/health`, {
        method: 'GET',
        signal: controller.signal,
        headers: {
          'Accept': 'application/json',
        },
      });

      clearTimeout(timeoutId);
      const online = response.ok;

      if (isMounted.current) {
        // Trigger haptic on transition from online to offline
        if (lastOnlineState.current && !online) {
          hapticWarning();
        }

        lastOnlineState.current = online;
        setIsOnline(online);

        // Cache the network state
        const status: NetworkStatus = {
          online,
          timestamp: Date.now(),
        };
        await AsyncStorage.setItem(NETWORK_STATUS_KEY, JSON.stringify(status));
      }

      return online;
    } catch (error) {
      if (isMounted.current) {
        // Network error indicates offline state
        if (lastOnlineState.current) {
          hapticWarning();
        }

        lastOnlineState.current = false;
        setIsOnline(false);

        const status: NetworkStatus = {
          online: false,
          timestamp: Date.now(),
        };
        await AsyncStorage.setItem(NETWORK_STATUS_KEY, JSON.stringify(status));
      }

      return false;
    } finally {
      if (isMounted.current) {
        setIsChecking(false);
      }
    }
  }, []);

  const loadCachedStatus = useCallback(async (): Promise<void> => {
    try {
      const cached = await AsyncStorage.getItem(NETWORK_STATUS_KEY);

      if (cached && isMounted.current) {
        const status: NetworkStatus = JSON.parse(cached);
        const isCacheValid = Date.now() - status.timestamp < CACHE_VALIDITY_MS;

        if (isCacheValid) {
          setIsOnline(status.online);
          lastOnlineState.current = status.online;
        }
      }
    } catch (error) {
      // Silently ignore cache read errors
    }
  }, []);

  useEffect(() => {
    isMounted.current = true;

    // Load cached status immediately for faster UI
    loadCachedStatus();

    // Then perform actual network check
    checkNetworkStatus();

    // Set up periodic checks
    checkIntervalRef.current = setInterval(checkNetworkStatus, CHECK_INTERVAL_MS);

    return () => {
      isMounted.current = false;

      if (checkIntervalRef.current) {
        clearInterval(checkIntervalRef.current);
        checkIntervalRef.current = null;
      }
    };
  }, [checkNetworkStatus, loadCachedStatus]);

  return {
    isOnline,
    isChecking,
    checkNow: checkNetworkStatus,
  };
}
