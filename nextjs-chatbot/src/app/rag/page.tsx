"use client";

import { useAuth } from "@/contexts/auth-context";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import ProtectedRoute from "@/components/ProtectedRoute";
import RAGLayout from "@/components/rag-ui/RAGLayout";

// Define roles that have access to the RAG page
const RAG_ACCESS_ROLES = ['admin', 'manager'];
// Define specific users that have access
const RAG_ACCESS_USERS = ['slampropulos', 'superuser'];

export default function RAGPage() {
    const { isAuthenticated, isLoading, authState } = useAuth();
    const router = useRouter();
    const [isAuthorized, setIsAuthorized] = useState(false);

    useEffect(() => {
        if (!isLoading) {
            if (!isAuthenticated) {
                router.push("/login");
                return;
            }

            const user = authState.user;
            const userHasRole = user && RAG_ACCESS_ROLES.includes(user.role);
            const userIsWhitelisted = user && RAG_ACCESS_USERS.includes(user.username);

            // Allow access in development to avoid blocking local testing
            const devBypass = process.env.NODE_ENV === 'development';

            if (userHasRole || userIsWhitelisted || devBypass) {
                setIsAuthorized(true);
            } else {
                // For unauthorized users, redirect to the main chat page
                router.push("/");
            }
        }
    }, [isAuthenticated, isLoading, router, authState.user]);

    // While loading or if not authorized, render nothing to prevent layout flash
    if (isLoading || !isAuthorized) {
        return null;
    }

    return (
        <ProtectedRoute>
            <RAGLayout />
        </ProtectedRoute>
    );
}
