'use client';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/auth-context';
import { useEffect, useRef } from 'react';

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
    <div className="flex flex-col items-center justify-center h-screen">
      <h1 className="text-2xl font-bold">Logging out...</h1>
      <p className="mt-4">You will be redirected to the login page shortly.</p>
    </div>
  );
}
