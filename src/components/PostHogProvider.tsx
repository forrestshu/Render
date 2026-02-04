'use client';

import { useEffect, Suspense } from 'react';
import { usePathname, useSearchParams } from 'next/navigation';
import { initPostHog, posthog } from '@/lib/posthog';

function PostHogPageView() {
  const pathname = usePathname();
  const searchParams = useSearchParams();

  useEffect(() => {
    // 追踪页面浏览
    if (pathname && typeof window !== 'undefined') {
      try {
        let url = window.origin + pathname;
        if (searchParams && searchParams.toString()) {
          url = url + `?${searchParams.toString()}`;
        }
        if (posthog && (posthog as any).__loaded) {
          posthog.capture('$pageview', {
            $current_url: url,
          });
        }
      } catch (error) {
        // 静默处理错误，避免影响页面功能
        if (process.env.NODE_ENV === 'development') {
          console.error('PostHog pageview error:', error);
        }
      }
    }
  }, [pathname, searchParams]);

  return null;
}

export default function PostHogProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  useEffect(() => {
    // 初始化 PostHog
    initPostHog();
  }, []);

  return (
    <>
      <Suspense fallback={null}>
        <PostHogPageView />
      </Suspense>
      {children}
    </>
  );
}
