'use client';

import posthog from 'posthog-js';

let isInitialized = false;

export const initPostHog = () => {
  if (typeof window === 'undefined') return;
  
  // 避免重复初始化
  if (isInitialized) return;
  
  const posthogKey = process.env.NEXT_PUBLIC_POSTHOG_KEY;
  const posthogHost = process.env.NEXT_PUBLIC_POSTHOG_HOST || 'https://us.i.posthog.com';
  
  if (posthogKey) {
    try {
      posthog.init(posthogKey, {
        api_host: posthogHost,
        loaded: (posthog) => {
          if (process.env.NODE_ENV === 'development') {
            console.log('PostHog initialized');
          }
        },
      });
      isInitialized = true;
    } catch (error) {
      console.error('PostHog initialization error:', error);
    }
  } else {
    if (process.env.NODE_ENV === 'development') {
      console.warn('PostHog key not found. Analytics will not work.');
    }
  }
};

// 安全的事件捕获函数
export const captureEvent = (eventName: string, properties?: Record<string, any>) => {
  if (typeof window === 'undefined') return;
  if (!isInitialized) return;
  
  try {
    posthog.capture(eventName, properties);
  } catch (error) {
    console.error('PostHog capture error:', error);
  }
};

export { posthog };
