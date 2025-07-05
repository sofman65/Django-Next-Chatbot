'use client';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/auth-context';
import { useEffect, useRef } from 'react';
import BrandedLoading from '@/components/ui/branded-loading';

export default function LogoutPage() {
  const { logout, isAuthenticated, isLoading } = useAuth();
  const router = useRouter();
  const didRunOnce = useRef(false);

  useEffect(() => {
    // Only trigger logout once
    if (!didRunOnce.current && isAuthenticated && !isLoading) {
      didRunOnce.current = true;
      logout();
      // don't redirect here: let auth-context.tsx handle clearing state
    }
    // After state is cleared, redirect to login if not authenticated and not loading
    if (!isAuthenticated && !isLoading) {
      router.replace('/login');
    }
  }, [logout, isAuthenticated, isLoading, router]);

  return (
    <BrandedLoading
      text="Signing Out"
      subText="Thank you for using DoChat.ai. You will be redirected shortly."
    />
  );
}
