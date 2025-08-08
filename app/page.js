'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function DefaultRedirect() {
  const router = useRouter();

  useEffect(() => {
    router.push('/ru');
  }, []);

  return null;
}