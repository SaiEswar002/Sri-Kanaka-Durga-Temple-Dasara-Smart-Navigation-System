'use client';

import { useCallback } from 'react';
import { useRouter } from 'next/navigation';

export function useLocale() {
  const router = useRouter();

  const setLocale = useCallback((locale: 'en' | 'te') => {
    document.cookie = `locale=${locale};path=/;max-age=31536000;SameSite=Lax`;
    router.refresh();
  }, [router]);

  return { setLocale };
}
