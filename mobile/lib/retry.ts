import { useState, useCallback } from 'react';

export interface RetryConfig {
  maxRetries: number;
  initialDelayMs: number;
  maxDelayMs: number;
  backoffMultiplier: number;
}

export const DEFAULT_RETRY_CONFIG: RetryConfig = {
  maxRetries: 3,
  initialDelayMs: 1000,
  maxDelayMs: 4000,
  backoffMultiplier: 2,
};

export interface RetryResult<T> {
  success: boolean;
  data?: T;
  error?: Error;
  attempts: number;
}

/**
 * Executes an async operation with exponential backoff retry logic.
 *
 * Retry delays: 1s → 2s → 4s (capped at maxDelayMs)
 */
export async function withRetry<T>(
  operation: () => Promise<T>,
  config: Partial<RetryConfig> = {}
): Promise<RetryResult<T>> {
  const finalConfig: RetryConfig = { ...DEFAULT_RETRY_CONFIG, ...config };
  const { maxRetries, initialDelayMs, maxDelayMs, backoffMultiplier } = finalConfig;

  let lastError: Error | undefined;
  let currentDelay = initialDelayMs;

  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      const result = await operation();

      return {
        success: true,
        data: result,
        attempts: attempt,
      };
    } catch (error) {
      lastError = error instanceof Error ? error : new Error(String(error));

      // If not the last attempt, wait before retrying
      if (attempt < maxRetries) {
        await sleep(currentDelay);
        currentDelay = Math.min(currentDelay * backoffMultiplier, maxDelayMs);
      }
    }
  }

  return {
    success: false,
    error: lastError,
    attempts: maxRetries,
  };
}

function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * Hook for tracking retry state in components.
 */
export function useRetryState() {
  const [retryCount, setRetryCount] = useState(0);
  const [isRetrying, setIsRetrying] = useState(false);

  const resetRetryCount = useCallback(() => {
    setRetryCount(0);
    setIsRetrying(false);
  }, []);

  const incrementRetry = useCallback(() => {
    setRetryCount(prev => prev + 1);
  }, []);

  const startRetrying = useCallback(() => {
    setIsRetrying(true);
  }, []);

  const stopRetrying = useCallback(() => {
    setIsRetrying(false);
  }, []);

  return {
    retryCount,
    isRetrying,
    resetRetryCount,
    incrementRetry,
    startRetrying,
    stopRetrying,
  };
}
