'use client';

import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/auth-context';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { WavyBackground } from '@/components/ui/wavy-background';
import { StreamingTextEffect } from '@/components/ui/streaming-text-effect';
import { useState, useEffect } from 'react';
import { Orbitron } from 'next/font/google';

const orbitron = Orbitron({
  subsets: ['latin'],
  weight: ['400', '700'],
});

export default function LoginPage() {
  const { login, isAuthenticated } = useAuth();
  const router = useRouter();
  const [error, setError] = useState('');
  const [credentials, setCredentials] = useState({ username: '', password: '' });

  useEffect(() => {
    if (isAuthenticated) {
      router.push('/');
    }
  }, [isAuthenticated, router]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await login(credentials);
    } catch (error) {
      setError('Invalid credentials');
    }
  };

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
      <div className="relative z-10 min-h-screen flex items-center justify-center p-4">
        <div className="w-full max-w-6xl mx-auto grid grid-cols-1 lg:grid-cols-2 gap-8 lg:gap-16 items-center">

          {/* Left Column: Brand & Messaging */}
          <div className="text-center lg:text-left">
            <div className="flex flex-col items-center lg:items-start space-y-8">
              <div className="space-y-4">
                <h1 className={`${orbitron.className} text-5xl lg:text-7xl font-bold bg-gradient-to-r from-blue-400 via-teal-400 to-emerald-400 bg-clip-text text-transparent`}>
                  DoChat.ai
                </h1>
                <div className="text-lg lg:text-xl text-slate-300 min-h-[3rem]">
                  <StreamingTextEffect
                    text="Your intelligent AI assistant for seamless conversations."
                    className="text-lg lg:text-xl text-slate-300"
                    duration={0.03}
                  />
                </div>
              </div>

              <div className="space-y-4 text-slate-400 pt-4">
                <div className="flex items-center gap-3 justify-center lg:justify-start">
                  <div className="w-2 h-2 bg-teal-400 rounded-full animate-pulse"></div>
                  <span>Powered by advanced AI models</span>
                </div>
                <div className="flex items-center gap-3 justify-center lg:justify-start">
                  <div className="w-2 h-2 bg-emerald-400 rounded-full animate-pulse"></div>
                  <span>Real-time streaming responses</span>
                </div>
                <div className="flex items-center gap-3 justify-center lg:justify-start">
                  <div className="w-2 h-2 bg-blue-400 rounded-full animate-pulse"></div>
                  <span>Secure and private conversations</span>
                </div>
              </div>
            </div>
          </div>

          {/* Right Column: Login Form */}
          <div className="w-full max-w-md mx-auto">
            <div className="bg-slate-900/40 backdrop-blur-lg border border-white/10 rounded-2xl p-8 shadow-2xl">
              <div className="space-y-6">
                <div className="text-center">
                  <h2 className={`${orbitron.className} text-3xl font-bold text-white mb-2`}>Welcome Back</h2>
                  <p className="text-slate-400">Sign in to continue your AI journey.</p>
                </div>

                <form onSubmit={handleSubmit} className="space-y-4">
                  {error && (
                    <div className="p-3 text-sm text-red-400 bg-red-400/10 border border-red-400/20 rounded-lg">
                      {error}
                    </div>
                  )}

                  <div className="space-y-2">
                    <Label htmlFor="username" className="text-slate-300">Username</Label>
                    <Input
                      id="username"
                      type="text"
                      value={credentials.username}
                      onChange={(e) => setCredentials(prev => ({ ...prev, username: e.target.value }))}
                      className="bg-white/5 border-white/20 text-white placeholder:text-slate-400 focus:border-blue-400 focus:ring-blue-400/20"
                      placeholder="Enter your username"
                      required
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="password" className="text-slate-300">Password</Label>
                    <Input
                      id="password"
                      type="password"
                      value={credentials.password}
                      onChange={(e) => setCredentials(prev => ({ ...prev, password: e.target.value }))}
                      className="bg-white/5 border-white/20 text-white placeholder:text-slate-400 focus:border-blue-400 focus:ring-blue-400/20"
                      placeholder="Enter your password"
                      required
                    />
                  </div>

                  <Button
                    type="submit"
                    className="w-full bg-gradient-to-r from-blue-600 to-teal-600 hover:from-blue-700 hover:to-teal-700 text-white font-bold py-3 rounded-lg transition-all duration-300 shadow-lg hover:shadow-2xl transform hover:-translate-y-0.5"
                  >
                    Sign In
                  </Button>
                </form>

                <div className="text-center text-sm text-slate-400">
                  <p>Don't have an account? <a href="/signup" className="font-medium text-blue-400 hover:text-blue-300 transition-colors">Sign up</a> or <a href="#" className="font-medium text-blue-400 hover:text-blue-300 transition-colors">contact your administrator</a></p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </WavyBackground>
  );
}