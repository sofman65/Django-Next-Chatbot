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

const BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_URL;

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

    const [activeTab, setActiveTab] = useState<'upload' | 'documents' | 'chat' | 'admin'>('upload');
    const [selectedDocumentSet, setSelectedDocumentSet] = useState<string>('');
    const [documentSets, setDocumentSets] = useState<DocumentSet[]>([]);
    const [refreshTrigger, setRefreshTrigger] = useState(0);
    const [prevProcessingCount, setPrevProcessingCount] = useState(0);

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
        <div className="flex h-screen bg-space-black">
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
                    <div className="glass border-b border-white/10">
                        <div className="px-4 sm:px-6">
                            <nav className="flex space-x-4 sm:space-x-8 overflow-x-auto custom-scrollbar">
                                <button
                                    onClick={() => setActiveTab('upload')}
                                    className={`py-3 sm:py-4 px-1 border-b-2 font-medium text-xs sm:text-sm whitespace-nowrap transition-all duration-200 ${activeTab === 'upload'
                                        ? 'border-blue-400 text-blue-400 bg-blue-400/10'
                                        : 'border-transparent text-lunar-grey hover:text-stellar-white hover:border-blue-400/50'
                                        }`}
                                >
                                    Upload
                                </button>
                                <button
                                    onClick={() => setActiveTab('documents')}
                                    className={`py-3 sm:py-4 px-1 border-b-2 font-medium text-xs sm:text-sm whitespace-nowrap transition-all duration-200 ${activeTab === 'documents'
                                        ? 'border-blue-400 text-blue-400 bg-blue-400/10'
                                        : 'border-transparent text-lunar-grey hover:text-stellar-white hover:border-blue-400/50'
                                        }`}
                                >
                                    Documents
                                </button>
                                <button
                                    onClick={() => setActiveTab('chat')}
                                    className={`py-3 sm:py-4 px-1 border-b-2 font-medium text-xs sm:text-sm whitespace-nowrap transition-all duration-200 ${activeTab === 'chat'
                                        ? 'border-blue-400 text-blue-400 bg-blue-400/10'
                                        : 'border-transparent text-lunar-grey hover:text-stellar-white hover:border-blue-400/50'
                                        }`}
                                    disabled={!selectedDocumentSet}
                                >
                                    <span className="hidden sm:inline">RAG Chat</span>
                                    <span className="sm:hidden">Chat</span>
                                    {selectedDocumentSet && (
                                        <span className="ml-1 sm:ml-2 px-1 sm:px-2 py-1 text-xs gradient-space text-white rounded-full animate-pulse-slow">
                                            <span className="hidden sm:inline">{selectedDocumentSet}</span>
                                            <span className="sm:hidden">•</span>
                                        </span>
                                    )}
                                </button>
                                <button
                                    onClick={() => setActiveTab('admin')}
                                    className={`py-3 sm:py-4 px-1 border-b-2 font-medium text-xs sm:text-sm whitespace-nowrap transition-all duration-200 ${activeTab === 'admin'
                                        ? 'border-blue-400 text-blue-400 bg-blue-400/10'
                                        : 'border-transparent text-lunar-grey hover:text-stellar-white hover:border-blue-400/50'
                                        }`}
                                >
                                    <span className="hidden sm:inline">Admin</span>
                                    <span className="sm:hidden">Admin</span>
                                </button>
                            </nav>
                        </div>
                    </div>

                    {/* Tab Content */}
                    <div className="flex-1 overflow-auto bg-space-black">
                        {activeTab === 'upload' && (
                            <DocumentUpload
                                fetchWithAuth={fetchWithAuth}
                                onUploadComplete={refreshData}
                                token={token || ''}
                            />
                        )}

                        {activeTab === 'documents' && (
                            <DocumentSets
                                fetchWithAuth={fetchWithAuth}
                                refreshTrigger={refreshTrigger}
                                selectedDocumentSet={selectedDocumentSet}
                                onSelectDocumentSet={setSelectedDocumentSet}
                                documentSets={documentSets}
                                setDocumentSets={setDocumentSets}
                                fetchDocumentSets={fetchDocumentSets}
                            />
                        )}

                        {activeTab === 'chat' && selectedDocumentSet && (
                            <RAGChat
                                fetchWithAuth={fetchWithAuth}
                                documentSetName={selectedDocumentSet}
                            />
                        )}

                        {activeTab === 'chat' && !selectedDocumentSet && (
                            <div className="flex items-center justify-center h-full bg-space-black">
                                <div className="text-center p-8">
                                    <div className="card-space rounded-2xl p-8 max-w-md mx-auto">
                                        <h3 className="text-lg font-medium text-stellar-white mb-2">
                                            Select a Document Set
                                        </h3>
                                        <p className="text-lunar-grey mb-6">
                                            Choose a processed document set to start chatting.
                                        </p>
                                        <button
                                            onClick={() => setActiveTab('documents')}
                                            className="btn-space px-6 py-3 rounded-lg font-medium text-stellar-white transition-all duration-200 hover:scale-105"
                                        >
                                            View Document Sets
                                        </button>
                                    </div>
                                </div>
                            </div>
                        )}

                        {activeTab === 'admin' && (
                            <div className="p-6 bg-space-black">
                                <AdminActions
                                    fetchWithAuth={fetchWithAuth}
                                    onRefresh={fetchDocumentSets}
                                />
                            </div>
                        )}
                    </div>
                </div>

                {/* Pipeline Status (floating) */}
                <PipelineStatus
                    fetchWithAuth={fetchWithAuth}
                    documentSets={documentSets}
                    refreshTrigger={refreshTrigger}
                    onStatusUpdate={refreshData}
                />

                {/* Toast Notifications */}
                <ToastManager
                    toasts={toasts}
                    onRemoveToast={removeToast}
                />
            </div>
        </div>
    );
}
