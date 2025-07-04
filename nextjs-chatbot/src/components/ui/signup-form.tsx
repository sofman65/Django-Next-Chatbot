"use client";
import React, { useState } from "react";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/enhanced-input";
import { cn } from "@/lib/utils";
import { IconBrandGithub, IconBrandGoogle } from "@tabler/icons-react";
import { Space_Grotesk } from "next/font/google";
import { useRouter } from "next/navigation";

const spaceGrotesk = Space_Grotesk({
    subsets: ["latin"],
    weight: ['600'],
});

interface SignupFormProps {
    onSuccess?: () => void;
}

export default function SignupForm({ onSuccess }: SignupFormProps) {
    const router = useRouter();
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [formData, setFormData] = useState({
        firstName: '',
        lastName: '',
        email: '',
        password: '',
        confirmPassword: ''
    });

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const { id, value } = e.target;
        setFormData(prev => ({
            ...prev,
            [id]: value
        }));
    };

    const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        setError(null);
        setIsLoading(true);

        // Validate password match
        if (formData.password !== formData.confirmPassword) {
            setError("Passwords don't match");
            setIsLoading(false);
            return;
        }

        try {
            const response = await fetch('/api/auth/signup', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    first_name: formData.firstName,
                    last_name: formData.lastName,
                    email: formData.email,
                    password: formData.password,
                }),
            });

            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.message || 'Failed to create account');
            }

            // Success - redirect or call onSuccess callback
            if (onSuccess) {
                onSuccess();
            } else {
                router.push('/login');
            }
        } catch (err: any) {
            setError(err.message || 'Something went wrong');
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="mx-auto w-full max-w-md rounded-2xl bg-slate-900/40 backdrop-blur-lg border border-white/10 p-6 md:p-8 shadow-2xl">
            <h2 className={`${spaceGrotesk.className} text-2xl font-semibold text-white mb-2`}>
                Join DoChat.ai
            </h2>
            <p className="text-sm text-slate-400">
                Start turning conversation into action today
            </p>

            {error && (
                <div className="my-4 p-3 text-sm text-red-400 bg-red-400/10 border border-red-400/20 rounded-lg">
                    {error}
                </div>
            )}

            <form className="mt-6 space-y-4" onSubmit={handleSubmit}>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <LabelInputContainer>
                        <Label htmlFor="firstName">First name</Label>
                        <Input
                            id="firstName"
                            placeholder="Jane"
                            type="text"
                            value={formData.firstName}
                            onChange={handleChange}
                            required
                        />
                    </LabelInputContainer>
                    <LabelInputContainer>
                        <Label htmlFor="lastName">Last name</Label>
                        <Input
                            id="lastName"
                            placeholder="Doe"
                            type="text"
                            value={formData.lastName}
                            onChange={handleChange}
                            required
                        />
                    </LabelInputContainer>
                </div>

                <LabelInputContainer>
                    <Label htmlFor="email">Email address</Label>
                    <Input
                        id="email"
                        placeholder="name@company.com"
                        type="email"
                        value={formData.email}
                        onChange={handleChange}
                        required
                    />
                </LabelInputContainer>

                <LabelInputContainer>
                    <Label htmlFor="password">Password</Label>
                    <Input
                        id="password"
                        placeholder="••••••••"
                        type="password"
                        value={formData.password}
                        onChange={handleChange}
                        required
                        minLength={8}
                    />
                </LabelInputContainer>

                <LabelInputContainer>
                    <Label htmlFor="confirmPassword">Confirm password</Label>
                    <Input
                        id="confirmPassword"
                        placeholder="••••••••"
                        type="password"
                        value={formData.confirmPassword}
                        onChange={handleChange}
                        required
                    />
                </LabelInputContainer>

                <button
                    className="group/btn relative block h-11 w-full rounded-lg bg-gradient-to-r from-blue-600 to-teal-600 hover:from-blue-700 hover:to-teal-700 text-white font-medium shadow-lg shadow-blue-500/25 transition-all duration-300 disabled:opacity-70 disabled:cursor-not-allowed"
                    type="submit"
                    disabled={isLoading}
                >
                    {isLoading ? 'Creating account...' : 'Create your account →'}
                    <BottomGradient />
                </button>

                <div className="my-6 flex items-center">
                    <div className="flex-grow h-[1px] bg-gradient-to-r from-transparent via-slate-600 to-transparent" />
                    <span className="px-3 text-sm text-slate-400">or continue with</span>
                    <div className="flex-grow h-[1px] bg-gradient-to-r from-transparent via-slate-600 to-transparent" />
                </div>

                <div className="flex flex-col space-y-3">
                    <button
                        className="group/btn relative flex h-11 w-full items-center justify-center space-x-2 rounded-lg bg-slate-800/50 border border-white/5 px-4 font-medium text-white transition-colors hover:bg-slate-700/50"
                        type="button"
                    >
                        <IconBrandGoogle className="h-5 w-5 text-white" />
                        <span className="text-sm">Continue with Google</span>
                        <BottomGradient />
                    </button>
                    <button
                        className="group/btn relative flex h-11 w-full items-center justify-center space-x-2 rounded-lg bg-slate-800/50 border border-white/5 px-4 font-medium text-white transition-colors hover:bg-slate-700/50"
                        type="button"
                    >
                        <IconBrandGithub className="h-5 w-5 text-white" />
                        <span className="text-sm">Continue with GitHub</span>
                        <BottomGradient />
                    </button>
                </div>

                <div className="mt-6 text-center text-sm text-slate-400">
                    Already have an account?{" "}
                    <a
                        href="/login"
                        className="font-medium text-blue-400 hover:text-blue-300 transition-colors"
                    >
                        Sign in
                    </a>
                </div>
            </form>
        </div>
    );
}

const BottomGradient = () => {
    return (
        <>
            <span className="absolute inset-x-0 -bottom-px block h-px w-full bg-gradient-to-r from-transparent via-teal-500 to-transparent opacity-0 transition duration-500 group-hover/btn:opacity-100" />
            <span className="absolute inset-x-10 -bottom-px mx-auto block h-px w-1/2 bg-gradient-to-r from-transparent via-blue-500 to-transparent opacity-0 blur-sm transition duration-500 group-hover/btn:opacity-100" />
        </>
    );
};

const LabelInputContainer = ({
    children,
    className,
}: {
    children: React.ReactNode;
    className?: string;
}) => {
    return (
        <div className={cn("flex w-full flex-col space-y-2", className)}>
            {children}
        </div>
    );
};
