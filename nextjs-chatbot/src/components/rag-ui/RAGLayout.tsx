"use client";

import { useState, useCallback, useRef, useEffect } from "react";
import { useAuth } from "@/contexts/auth-context";
import { RAGHeader } from "./RAGHeader";
import { DocumentUpload } from "./DocumentUpload";
import { DocumentSets } from "./DocumentSets";
import { PipelineStatus } from "./PipelineStatus";
import { LiveProcessingLogs } from "./LiveProcessingLogs";
import { RAGChat } from "./RAGChat";
import { ToastManager, useToasts } from "./ToastManager";
import { useSidebar } from "@/components/ui/sidebar";
import { AdminActions } from "./AdminActions";
import { useIsMobile } from "@/hooks/use-mobile";
import { useInterval } from 'usehooks-ts';

const BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_URL;

if (!BACKEND_URL) {
    throw new Error("NEXT_PUBLIC_BACKEND_URL is not defined. Please check your environment variables.");
}

const TABS = [
    { id: 'upload', label: 'Upload' },
    { id: 'documents', label: 'Documents' },
    { id: 'chat', label: 'Chat' },
    { id: 'admin', label: 'Admin' },
];

const POLLING_INTERVAL = 5000; // 5 seconds

export type DocumentSet = {
    name: string;
    document_count: number;
    created_at: string;
    status: 'processing' | 'completed' | 'failed' | 'parsing' | 'indexing' | 'pending' | 'idle' | 'not_configured';
    progress?: number;
    current_step?: string;
};

export type Document = {
    id: string;
    filename: string;
    uploaded_at: string;
    size: number;
    status: string;
};

export default function RAGLayout() {
    const isMobile = useIsMobile();
    const { openMobile, setOpenMobile } = useSidebar();
    const { authState } = useAuth();
    const token = authState.accessToken;
    const { toasts, addToast, removeToast } = useToasts();

    const [activeTab, setActiveTab] = useState<string>('upload');
    const [selectedDocumentSet, setSelectedDocumentSet] = useState<string>('');
    const [documentSets, setDocumentSets] = useState<DocumentSet[]>([]);
    const [refreshTrigger, setRefreshTrigger] = useState(0);
    const [prevProcessingCount, setPrevProcessingCount] = useState(0);
    const documentSetsRef = useRef<DocumentSet[]>([]);

    useEffect(() => {
        documentSetsRef.current = documentSets;
    }, [documentSets]);

    // fetchWithAuth helper (similar to ChatLayout)
    const fetchWithAuth = useCallback(
        async (input: RequestInfo, init: RequestInit = {}) => {
            if (!token) throw new Error("No access token");
            const doFetch = (t: string) =>
                fetch(input, {
                    ...init,
                    headers: {
                        "Content-Type": "application/json",
                        Authorization: `Bearer ${t}`,
                        ...(init.headers || {}),
                    },
                });
            let res = await doFetch(token);
            if (res.status === 401) {
                // Handle token refresh if needed
                throw new Error("Authentication failed");
            }
            return res;
        },
        [token]
    );

    const refreshData = () => {
        setRefreshTrigger(prev => prev + 1);
    };

    const fetchDocumentSets = useCallback(async () => {
        try {
            const response = await fetchWithAuth(`${BACKEND_URL}/api/rag/document-sets/list/`);
            if (!response.ok) throw new Error('Failed to fetch document sets');

            const data = await response.json();
            let documentSets = data.document_sets || [];

            // Fetch detailed status for active document sets
            for (let i = 0; i < documentSets.length; i++) {
                if (['processing', 'parsing', 'indexing', 'pending'].includes(documentSets[i].status)) {
                    try {
                        const statusResponse = await fetchWithAuth(
                            `${BACKEND_URL}/api/rag/pipeline/status/${encodeURIComponent(documentSets[i].name)}/`
                        );
                        if (statusResponse.ok) {
                            const statusData = await statusResponse.json();
                            documentSets[i] = {
                                ...documentSets[i],
                                progress: statusData.progress_percentage,
                                current_step: statusData.current_step,
                                status: statusData.status // Keep the original status from backend
                            };
                        }
                    } catch (error) {
                        console.error(`Error fetching status for ${documentSets[i].name}:`, error);
                    }
                }
            }

            setDocumentSets(documentSets);
        } catch (error) {
            console.error('Error fetching document sets:', error);
            setDocumentSets([]);
        }
    }, [fetchWithAuth]);

    // Use a hook for polling to ensure it's managed correctly
    useInterval(
        () => {
            const isProcessing = documentSetsRef.current.some(ds =>
                ['processing', 'parsing', 'indexing', 'pending'].includes(ds.status)
            );
            if (isProcessing) {
                fetchDocumentSets();
            }
        },
        POLLING_INTERVAL
    );

    // Initial load and refresh trigger handling
    useEffect(() => {
        fetchDocumentSets();
    }, [refreshTrigger, fetchDocumentSets]);

    // Monitor for processing completion to show notifications
    useEffect(() => {
        const currentProcessingCount = documentSets.filter(ds => ds.status === 'processing').length;
        const completedSets = documentSets.filter(ds => ds.status === 'completed');
        const failedSets = documentSets.filter(ds => ds.status === 'failed');

        // Check if processing count decreased (meaning something completed or failed)
        if (prevProcessingCount > currentProcessingCount && prevProcessingCount > 0) {
            // Find newly completed sets
            completedSets.forEach(docSet => {
                addToast({
                    type: 'success',
                    title: 'Processing Complete!',
                    message: `Document set "${docSet.name}" is ready for chat.`,
                    duration: 8000
                });
            });

            // Find newly failed sets
            failedSets.forEach(docSet => {
                addToast({
                    type: 'error',
                    title: 'Processing Failed',
                    message: `Document set "${docSet.name}" failed to process. Check the logs for details.`,
                    duration: 10000
                });
            });
        }

        setPrevProcessingCount(currentProcessingCount);
    }, [documentSets, prevProcessingCount, addToast]);

    const handleSidebarToggle = () => {
        if (isMobile) {
            setOpenMobile(!openMobile);
        }
    };

    return (
        <div className="w-screen h-screen bg-slate-950">
            <div className="flex-1 flex flex-col overflow-hidden">
                {/* Header */}
                <RAGHeader
                    onToggleSidebar={handleSidebarToggle}
                    isSidebarOpen={openMobile}
                />

                {/* Live Processing Logs */}
                <LiveProcessingLogs
                    fetchWithAuth={fetchWithAuth}
                    documentSets={documentSets}
                    refreshTrigger={refreshTrigger}
                />

                {/* Main Content */}
                <div className="flex-1 flex flex-col overflow-hidden">
                    {/* Tab Navigation */}
                    <div className="bg-slate-900/50 border-b border-white/10">
                        <div className="px-4 sm:px-6">
                            <nav className="flex space-x-4 sm:space-x-8 overflow-x-auto custom-scrollbar">
                                {TABS.map(tab => (
                                    <button
                                        key={tab.id}
                                        onClick={() => setActiveTab(tab.id)}
                                        className={`py-3 sm:py-4 px-1 border-b-2 font-medium text-xs sm:text-sm whitespace-nowrap transition-all duration-200 ${activeTab === tab.id
                                            ? 'border-blue-400 text-blue-400 bg-blue-400/10'
                                            : 'border-transparent text-slate-400 hover:text-white hover:border-blue-400/50'
                                            }`}
                                    >
                                        {tab.label}
                                    </button>
                                ))}
                            </nav>
                        </div>
                    </div>

                    {/* Tab Content */}
                    <div className="flex-1 overflow-y-auto p-4 sm:p-6">
                        {activeTab === 'upload' && (
                            <DocumentUpload
                                fetchWithAuth={fetchWithAuth}
                                onUploadComplete={refreshData}
                                token={token || ''}
                            />
                        )}
                        {activeTab === 'documents' && (
                            <DocumentSets
                                documentSets={documentSets}
                                onSelectSet={setSelectedDocumentSet}
                                onRefresh={refreshData}
                                fetchWithAuth={fetchWithAuth}
                                addToast={addToast}
                            />
                        )}
                        {activeTab === 'chat' && (
                            <RAGChat
                                selectedDocumentSet={selectedDocumentSet}
                                fetchWithAuth={fetchWithAuth}
                                addToast={addToast}
                            />
                        )}
                        {activeTab === 'admin' && (
                            <AdminActions
                                fetchWithAuth={fetchWithAuth}
                                onRefresh={refreshData}
                            />
                        )}
                    </div>
                </div>
            </div>
            <ToastManager toasts={toasts} onRemoveToast={removeToast} />
        </div>
    );
}
