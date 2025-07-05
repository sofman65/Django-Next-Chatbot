'use client';

import { Orbitron } from 'next/font/google';
import { WavyBackground } from '@/components/ui/wavy-background';
import { cn } from '@/lib/utils';

const orbitron = Orbitron({
    subsets: ['latin'],
    weight: ['400', '700'],
});

type BrandedLoadingProps = {
    /**
     * Set to true to use a minimal version without the wavy background
     * Useful for inline loading states
     */
    minimal?: boolean;

    /**
     * Custom text to display (defaults to "Warming up the AI...")
     */
    text?: string;

    /**
     * Secondary text to display below the main text
     */
    subText?: string;

    /**
     * Whether to show the progress bar
     */
    showProgress?: boolean;

    /**
     * Whether to show the logo
     */
    showLogo?: boolean;

    /**
     * Custom class name for the container
     */
    className?: string;
};

export default function BrandedLoading({
    minimal = false,
    text = "Warming up the AI...",
    subText = "This will just take a moment",
    showProgress = true,
    showLogo = true,
    className = "",
}: BrandedLoadingProps) {

    // Minimal version for inline loading states
    if (minimal) {
        return (
            <div className={cn("flex items-center justify-center p-4", className)}>
                <div className="flex items-center space-x-3">
                    {/* Simple spinner */}
                    <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-blue-400"></div>
                    <span className="text-sm text-stellar-white">{text}</span>
                </div>
            </div>
        );
    }

    // Full version with wavy background
    const content = (
        <div className="text-center space-y-6">
            {/* Logo */}
            {showLogo && (
                <div className="mb-8">
                    <h1 className={cn(
                        orbitron.className,
                        "text-4xl md:text-6xl font-bold bg-gradient-to-r from-blue-400 via-teal-400 to-emerald-400 bg-clip-text text-transparent"
                    )}>
                        DoChat.ai
                    </h1>
                </div>
            )}

            {/* Loading indicator */}
            <div className="relative w-24 h-24 mx-auto mb-8">
                {/* Spinning outer ring */}
                <div className="absolute inset-0 rounded-full border-t-4 border-blue-500/30 animate-spin duration-1000"></div>
                <div className="absolute inset-0 rounded-full border-l-4 border-teal-500/40 animate-spin duration-1500 delay-150"></div>

                {/* Inner pulse */}
                <div className="absolute inset-4 rounded-full bg-gradient-to-br from-blue-500/30 to-teal-500/30 animate-pulse"></div>

                {/* Center dot */}
                <div className="absolute inset-[42%] rounded-full bg-white shadow-lg shadow-blue-500/50"></div>
            </div>

            {/* Loading text */}
            <div>
                <p className="text-lg text-white font-medium">{text}</p>
                {subText && <p className="text-sm text-slate-400 mt-2">{subText}</p>}
            </div>

            {/* Animated progress bar */}
            {showProgress && (
                <div className="w-64 md:w-80 mx-auto mt-8">
                    <div className="h-1.5 w-full bg-slate-800 rounded-full overflow-hidden">
                        <div className="h-full bg-gradient-to-r from-blue-500 via-teal-500 to-emerald-500 animate-loadingProgress rounded-full"></div>
                    </div>
                </div>
            )}
        </div>
    );

    if (className) {
        return (
            <WavyBackground
                className={cn("w-full min-h-screen", className)}
                containerClassName="min-h-screen"
                colors={["#2563EB", "#14B8A6", "#10B981", "#0F172A", "#64748B"]}
                waveWidth={60}
                backgroundFill="#0F172A"
                blur={15}
                speed="slow"
                waveOpacity={0.4}
            >
                <div className="relative z-10 flex flex-col items-center justify-center min-h-screen p-4">
                    {content}
                </div>
            </WavyBackground>
        );
    }

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
            <div className="relative z-10 flex flex-col items-center justify-center min-h-screen p-4">
                {content}
            </div>
        </WavyBackground>
    );
}
