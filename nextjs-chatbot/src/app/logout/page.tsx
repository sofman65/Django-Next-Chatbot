'use client';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/auth-context';
import { useEffect, useRef } from 'react';
import { WavyBackground } from '@/components/ui/wavy-background';
import { Orbitron } from 'next/font/google';

const orbitron = Orbitron({
  subsets: ['latin'],
  weight: ['400', '700'],
});

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
    <WavyBackground
      className="w-full min-h-screen"
      containerClassName="min-h-screen"
      colors={["#2563EB", "#14B8A6", "#10B981", "#0F172A", "#64748B"]}
      waveWidth={60}
      backgroundFill="#0F172A"
      blur={15}
      speed="slow"
      waveOpacity={0.4}
    >
      <div className="relative z-10 flex flex-col items-center justify-center min-h-screen p-4 text-center">
        {/* Logo/Brand Section */}
        <div className="mb-8">
          <h1 className={`${orbitron.className} text-5xl font-bold bg-gradient-to-r from-blue-400 via-teal-400 to-emerald-400 bg-clip-text text-transparent`}>
            DoChat.ai
          </h1>
        </div>

        {/* Logout Message */}
        <div className="bg-slate-900/40 backdrop-blur-lg border border-white/10 rounded-2xl p-8 shadow-2xl max-w-md mx-auto">
          <div className="flex items-center justify-center mb-4">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-400"></div>
          </div>

          <h2 className={`${orbitron.className} text-3xl font-bold text-white mb-2`}>Signing Out</h2>
          <p className="text-slate-400 mb-6">
            Thank you for using DoChat.ai. You will be redirected shortly.
          </p>

          {/* Progress indicator */}
          <div className="w-full bg-slate-800 rounded-full h-2 mb-4">
            <div className="bg-gradient-to-r from-blue-500 to-teal-500 h-2 rounded-full animate-pulse" style={{ width: '70%' }}></div>
          </div>

          <p className="text-slate-500 text-sm">
            Clearing session data...
          </p>
        </div>

        {/* Footer */}
        <div className="mt-8">
          <p className="text-slate-500 text-sm">
            Have a great day! 👋
          </p>
        </div>
      </div>
    </WavyBackground>
  );
}
