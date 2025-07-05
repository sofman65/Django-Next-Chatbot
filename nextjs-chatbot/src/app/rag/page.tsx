"use client";

import { useAuth } from "@/contexts/auth-context";
import { useRouter } from "next/navigation";
import { useEffect } from "react";
import ProtectedRoute from "@/components/ProtectedRoute";
import RAGLayout from "@/components/rag-ui/RAGLayout";
import BrandedLoading from "@/components/ui/branded-loading";

export default function RAGPage() {
    const { isAuthenticated, isLoading, authState } = useAuth();
    const router = useRouter();

    useEffect(() => {
        if (!isLoading && !isAuthenticated) {
            router.push("/login");
        }
    }, [isAuthenticated, isLoading, router]);

    if (isLoading) {
        return <BrandedLoading text="Loading RAG Interface" />;
    }

    // Check if user has appropriate role for RAG management
    // For development: allow all authenticated users
    // For production: restrict to specific roles/users
    const hasRAGAccess = true; // authState.user?.role === 'admin' || 
    // authState.user?.role === 'manager' ||
    // authState.user?.username === 'slampropulos' ||
    // authState.user?.username === 'superuser';

    if (!hasRAGAccess) {
        return (
            <div className="flex items-center justify-center h-screen">
                <div className="text-center">
                    <h2 className="text-2xl font-bold text-red-600 mb-4">Access Denied</h2>
                    <p className="text-gray-600">You don&apos;t have permission to access RAG management.</p>
                    <button
                        onClick={() => router.push("/")}
                        className="btn btn-primary mt-4"
                    >
                        Return to Chat
                    </button>
                </div>
            </div>
        );
    }

    return (
        <ProtectedRoute>
            <RAGLayout />
        </ProtectedRoute>
    );
}
