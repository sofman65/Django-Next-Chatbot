"use client";

import { useState, useEffect, useRef } from "react";
import { Database, FileText, Calendar, Play, CheckCircle, AlertCircle, Clock, RotateCcw, Trash2 } from "lucide-react";
import { DocumentSet } from "./RAGLayout";
import { useInterval } from 'usehooks-ts';

const BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_URL;
const POLLING_INTERVAL = 5000; // 5 seconds

interface DocumentSetsProps {
    documentSets: DocumentSet[];
    onSelectSet: (name: string) => void;
    onRefresh: () => void;
    fetchWithAuth: (input: RequestInfo, init?: RequestInit) => Promise<Response>;
    addToast: (toast: { type: 'success' | 'error'; title: string; message: string; duration?: number }) => void;
}

export function DocumentSets({
    documentSets,
    onSelectSet,
    onRefresh,
    fetchWithAuth,
    addToast
}: DocumentSetsProps) {
    const [loading, setLoading] = useState(true);
    const [actionInProgress, setActionInProgress] = useState<string | null>(null);
    const documentSetsRef = useRef(documentSets);

    useEffect(() => {
        documentSetsRef.current = documentSets;
    }, [documentSets]);

    useEffect(() => {
        if (documentSets.length > 0) {
            setLoading(false);
        }
    }, [documentSets]);

    useInterval(
        () => {
            const isProcessing = documentSetsRef.current.some(ds =>
                ['processing', 'parsing', 'indexing', 'pending'].includes(ds.status)
            );
            if (isProcessing) {
                onRefresh();
            }
        },
        POLLING_INTERVAL
    );

    const handlePipelineAction = async (action: 'start' | 'rebuild', documentSetName: string) => {
        setActionInProgress(`${action}-${documentSetName}`);
        try {
            const response = await fetchWithAuth(`${BACKEND_URL}/api/rag/pipeline/${action}/`, {
                method: 'POST',
                body: JSON.stringify({ document_set_name: documentSetName }),
            });

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.error || `Failed to ${action} pipeline`);
            }

            addToast({
                type: 'success',
                title: 'Pipeline Action Initiated',
                message: `The ${action} process for "${documentSetName}" has started.`,
            });
            onRefresh();
        } catch (error: any) {
            addToast({
                type: 'error',
                title: 'Action Failed',
                message: error.message,
            });
        } finally {
            setActionInProgress(null);
        }
    };

    const handleDeleteSet = async (documentSetName: string) => {
        if (!window.confirm(`Are you sure you want to delete the document set "${documentSetName}"? This action cannot be undone.`)) {
            return;
        }
        setActionInProgress(`delete-${documentSetName}`);
        try {
            // ... implementation for delete ...
        } finally {
            setActionInProgress(null);
        }
    };

    const getStatusIndicator = (status: DocumentSet['status'], progress?: number) => {
        const baseClasses = "flex items-center text-xs font-semibold px-2 py-1 rounded-full";
        switch (status) {
            case 'completed':
                return <div className={`${baseClasses} bg-green-500/20 text-green-400`}><CheckCircle className="w-3 h-3 mr-1.5" />Ready</div>;
            case 'processing':
            case 'parsing':
            case 'indexing':
            case 'pending':
                const displayProgress = progress !== undefined && progress > 5 ? `${progress.toFixed(0)}%` : '';
                const text = progress !== undefined && progress < 5 ? "Initializing..." : status.charAt(0).toUpperCase() + status.slice(1);
                return (
                    <div className={`${baseClasses} bg-blue-500/20 text-blue-400`}>
                        <div className="w-3 h-3 mr-1.5 animate-spin rounded-full border-2 border-blue-400 border-t-transparent" />
                        {text} {displayProgress}
                    </div>
                );
            case 'failed':
                return <div className={`${baseClasses} bg-red-500/20 text-red-400`}><AlertCircle className="w-3 h-3 mr-1.5" />Failed</div>;
            default:
                return <div className={`${baseClasses} bg-slate-600/50 text-slate-400`}><Clock className="w-3 h-3 mr-1.5" />Idle</div>;
        }
    };

    if (loading) {
        return <div className="text-center text-slate-400">Loading document sets...</div>;
    }

    return (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {documentSets.map((docSet) => (
                <div
                    key={docSet.name}
                    className="bg-slate-900/70 border border-white/10 rounded-lg shadow-lg transition-all duration-300 hover:shadow-blue-500/20 hover:border-blue-500/50 flex flex-col"
                >
                    <div className="p-5 flex-grow">
                        <div className="flex justify-between items-start mb-3">
                            <h3 className="text-lg font-bold text-white pr-2">{docSet.name}</h3>
                            {getStatusIndicator(docSet.status, docSet.progress)}
                        </div>
                        <div className="space-y-2 text-sm text-slate-400">
                            <div className="flex items-center"><FileText className="w-4 h-4 mr-2 text-slate-500" />{docSet.document_count} documents</div>
                            <div className="flex items-center"><Calendar className="w-4 h-4 mr-2 text-slate-500" />Created: {new Date(docSet.created_at).toLocaleDateString()}</div>
                        </div>
                    </div>
                    <div className="bg-slate-950/50 border-t border-white/10 p-3 flex items-center justify-end space-x-2">
                        <button
                            onClick={(e) => { e.stopPropagation(); handlePipelineAction('start', docSet.name); }}
                            disabled={actionInProgress !== null || docSet.status === 'processing'}
                            className="flex items-center px-3 py-1.5 text-xs font-semibold text-white bg-blue-600 hover:bg-blue-700 rounded-md disabled:bg-slate-600 disabled:cursor-not-allowed transition-colors"
                        >
                            <Play className="w-3 h-3 mr-1.5" /> Process
                        </button>
                        <button
                            onClick={(e) => { e.stopPropagation(); handlePipelineAction('rebuild', docSet.name); }}
                            disabled={actionInProgress !== null}
                            className="flex items-center px-3 py-1.5 text-xs font-semibold text-slate-300 bg-slate-700 hover:bg-slate-600 rounded-md disabled:bg-slate-600 disabled:cursor-not-allowed transition-colors"
                        >
                            <RotateCcw className="w-3 h-3 mr-1.5" /> Rebuild
                        </button>
                        <button
                            onClick={(e) => { e.stopPropagation(); handleDeleteSet(docSet.name); }}
                            disabled={actionInProgress !== null}
                            className="p-2 text-slate-400 hover:text-red-500 hover:bg-red-500/10 rounded-md disabled:opacity-50 transition-colors"
                            aria-label="Delete document set"
                        >
                            <Trash2 className="w-4 h-4" />
                        </button>
                    </div>
                </div>
            ))}
        </div>
    );
}
