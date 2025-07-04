'use client';

import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/auth-context';
import { useEffect } from 'react';
import { WavyBackground } from '@/components/ui/wavy-background';
import { Orbitron } from 'next/font/google';
import SignupForm from '@/components/ui/signup-form';
import { StreamingTextEffect } from '@/components/ui/streaming-text-effect';

const orbitron = Orbitron({
    subsets: ['latin'],
    weight: ['400', '700'],
});

export default function SignupPage() {
    const { isAuthenticated } = useAuth();
    const router = useRouter();

    useEffect(() => {
        if (isAuthenticated) {
            router.push('/');
        }
    }, [isAuthenticated, router]);

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
                                <div className="text-lg lg:text-xl text-slate-300 min-h-[6rem]">
                                    <StreamingTextEffect
                                        text="Turn conversation into action. Capture decisions, auto-generate next steps, and keep projects moving."
                                        className="text-lg lg:text-xl text-slate-300"
                                        duration={0.03}
                                    />
                                </div>
                            </div>

                            <div className="space-y-4 text-slate-400 pt-4">
                                <div className="flex items-center gap-3 justify-center lg:justify-start">
                                    <div className="w-2 h-2 bg-teal-400 rounded-full animate-pulse"></div>
                                    <span>Instant AI summaries</span>
                                </div>
                                <div className="flex items-center gap-3 justify-center lg:justify-start">
                                    <div className="w-2 h-2 bg-emerald-400 rounded-full animate-pulse"></div>
                                    <span>Automatic task generation</span>
                                </div>
                                <div className="flex items-center gap-3 justify-center lg:justify-start">
                                    <div className="w-2 h-2 bg-blue-400 rounded-full animate-pulse"></div>
                                    <span>Enterprise-grade security</span>
                                </div>
                                <div className="flex items-center gap-3 justify-center lg:justify-start">
                                    <div className="w-2 h-2 bg-indigo-400 rounded-full animate-pulse"></div>
                                    <span>Talk less. Do more.</span>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Right Column: Signup Form */}
                    <div className="w-full max-w-md mx-auto lg:mx-0">
                        <SignupForm />
                    </div>
                </div>
            </div>
        </WavyBackground>
    );
}
