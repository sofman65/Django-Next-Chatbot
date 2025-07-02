"use client";

import { useState, useEffect, useRef } from "react";
import { Database, FileText, Calendar, Play, CheckCircle, AlertCircle, Clock, RotateCcw } from "lucide-react";
import { DocumentSet } from "./RAGLayout";

const BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_URL;

interface DocumentSetsProps {
    fetchWithAuth: (input: RequestInfo, init?: RequestInit) => Promise<Response>;
    refreshTrigger: number;
    selectedDocumentSet: string;
    onSelectDocumentSet: (name: string) => void;
    documentSets: DocumentSet[];
    setDocumentSets: (sets: DocumentSet[]) => void;
    fetchDocumentSets: () => Promise<void>;
}

export function DocumentSets({
    fetchWithAuth,
    refreshTrigger,
    selectedDocumentSet,
    onSelectDocumentSet,
    documentSets,
    setDocumentSets,
    fetchDocumentSets
}: DocumentSetsProps) {
    const [loading, setLoading] = useState(true);
    const [startingPipeline, setStartingPipeline] = useState<string | null>(null);
    const [rebuildingPipeline, setRebuildingPipeline] = useState<string | null>(null);
    const documentSetsRef = useRef(documentSets);
    const lastPollTimeRef = useRef(0);

    // Keep the ref updated
    useEffect(() => {
        documentSetsRef.current = documentSets;
    }, [documentSets]);

    useEffect(() => {
        const loadData = async () => {
            setLoading(true);
            await fetchDocumentSets();
            setLoading(false);
        };

        loadData();
    }, [refreshTrigger, fetchDocumentSets]);

    // Separate useEffect for polling to avoid recreating intervals
    useEffect(() => {
        console.log('Setting up polling interval...');
        
        const interval = setInterval(() => {
            const now = Date.now();
            const timeSinceLastPoll = now - lastPollTimeRef.current;

            // Avoid polling too frequently (minimum 1.5 seconds between polls)
            if (timeSinceLastPoll < 1500) {
                console.log('Skipping poll - too frequent');
                return;
            }

            console.log('Checking document sets:', documentSetsRef.current.map(ds => `${ds.name}:${ds.status}`));

            const processingExists = documentSetsRef.current.some(ds =>
                ds.status === 'processing' ||
                ds.status === 'parsing' ||
                ds.status === 'indexing' ||
                ds.status === 'pending'
            );

            if (processingExists) {
                const activeSets = documentSetsRef.current.filter(ds =>
                    ds.status === 'processing' ||
                    ds.status === 'parsing' ||
                    ds.status === 'indexing' ||
                    ds.status === 'pending'
                ).map(ds => `${ds.name}:${ds.status}`);

                console.log('Polling for updates - found active pipelines:', activeSets);
                console.log('TEMPORARILY DISABLED POLLING TO DEBUG');
                // lastPollTimeRef.current = now;
                // fetchDocumentSets();
            } else {
                console.log('No active pipelines found, skipping poll');
            }
        }, 2000); // Poll every 2 seconds

        return () => {
            console.log('Cleaning up polling interval');
            clearInterval(interval);
        };
    }, [fetchDocumentSets]);

    const handleStartPipeline = async (documentSetName: string) => {
        setStartingPipeline(documentSetName);

        try {
            const response = await fetchWithAuth(`${BACKEND_URL}/api/rag/pipeline/start/`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ document_set_name: documentSetName }),
            });

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.error || 'Failed to start pipeline');
            }

            // Refresh the document sets to get updated status
            fetchDocumentSets();

        } catch (error) {
            console.error('Error starting pipeline:', error);
            // You might want to show an error toast here
        } finally {
            setStartingPipeline(null);
        }
    };

    const handleRebuildPipeline = async (documentSetName: string) => {
        setRebuildingPipeline(documentSetName);

        try {
            const response = await fetchWithAuth(`${BACKEND_URL}/api/rag/pipeline/rebuild/${documentSetName}/`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    clear_parsed: true,   // Clear parsed data for complete rebuild
                    clear_database: true  // Clear Django database records
                }),
            });

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.error || 'Failed to rebuild pipeline');
            }

            // Refresh the document sets to get updated status
            fetchDocumentSets();

        } catch (error) {
            console.error('Error rebuilding pipeline:', error);
            // You might want to show an error toast here
        } finally {
            setRebuildingPipeline(null);
        }
    };

    const getStatusIcon = (status: string) => {
        switch (status) {
            case 'completed':
                return <CheckCircle className="h-5 w-5 text-green-500" />;
            case 'processing':
                return <Clock className="h-5 w-5 text-blue-500 animate-spin" />;
            case 'failed':
                return <AlertCircle className="h-5 w-5 text-red-500" />;
            default:
                return <Database className="h-5 w-5 text-gray-400" />;
        }
    };

    const getStatusText = (status: string) => {
        switch (status) {
            case 'completed':
                return 'Ready for Chat';
            case 'processing':
                return 'Processing...';
            case 'parsing':
                return 'Parsing PDFs...';
            case 'indexing':
                return 'Creating Index...';
            case 'pending':
                return 'Preparing...';
            case 'idle':
                return 'Ready to Process';
            case 'failed':
                return 'Processing Failed';
            default:
                return 'Not Processed';
        }
    };

    const formatDate = (dateString: string) => {
        return new Date(dateString).toLocaleDateString('en-US', {
            year: 'numeric',
            month: 'short',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        });
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center h-64">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#3333CC]"></div>
            </div>
        );
    }

    return (
        <div className="w-full max-w-6xl mx-auto p-4 sm:p-6">
            <div className="bg-white rounded-lg shadow-sm border border-gray-200">
                <div className="p-4 sm:p-6">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-4 sm:mb-6 gap-2">
                        <h2 className="text-xl sm:text-2xl font-bold text-gray-900">Document Sets</h2>
                        <div className="text-sm text-gray-500">
                            {documentSets.length} document set{documentSets.length !== 1 ? 's' : ''}
                        </div>
                    </div>

                    {documentSets.length === 0 ? (
                        <div className="text-center py-12">
                            <Database className="mx-auto h-12 w-12 text-gray-400 mb-4" />
                            <h3 className="text-lg font-medium text-gray-900 mb-2">No Document Sets</h3>
                            <p className="text-gray-500">Upload some documents to get started.</p>
                        </div>
                    ) : (
                        <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3">
                            {documentSets.map((docSet) => (
                                <div
                                    key={docSet.name}
                                    className={`border rounded-lg p-4 cursor-pointer transition-all hover:shadow-md ${selectedDocumentSet === docSet.name
                                        ? 'border-[#3333CC] bg-[#3333CC]/5'
                                        : 'border-gray-200 hover:border-gray-300'
                                        }`}
                                    onClick={() => onSelectDocumentSet(docSet.name)}
                                >
                                    <div className="flex items-start justify-between mb-3">
                                        <div className="flex items-center space-x-2">
                                            {getStatusIcon(docSet.status)}
                                            <h3 className="font-medium text-gray-900 truncate">
                                                {docSet.name}
                                            </h3>
                                        </div>
                                        {selectedDocumentSet === docSet.name && (
                                            <div className="w-2 h-2 bg-[#3333CC] rounded-full"></div>
                                        )}
                                    </div>

                                    <div className="space-y-2 text-sm text-gray-600">
                                        <div className="flex items-center space-x-2">
                                            <FileText className="h-4 w-4" />
                                            <span>{docSet.document_count} document{docSet.document_count !== 1 ? 's' : ''}</span>
                                        </div>

                                        <div className="flex items-center space-x-2">
                                            <Calendar className="h-4 w-4" />
                                            <span>{formatDate(docSet.created_at)}</span>
                                        </div>

                                        <div className="flex items-center justify-between">
                                            <span className={`px-2 py-1 rounded-full text-xs font-medium ${docSet.status === 'completed' ? 'bg-green-100 text-green-800' :
                                                ['processing', 'parsing', 'indexing', 'pending'].includes(docSet.status) ? 'bg-blue-100 text-blue-800' :
                                                    docSet.status === 'failed' ? 'bg-red-100 text-red-800' :
                                                        'bg-gray-100 text-gray-800'
                                                }`}>
                                                {getStatusText(docSet.status)}
                                            </span>
                                        </div>
                                    </div>

                                    {/* Progress bar for processing */}
                                    {['processing', 'parsing', 'indexing', 'pending'].includes(docSet.status) && docSet.progress !== undefined && (
                                        <div className="mt-3">
                                            <div className="w-full bg-gray-200 rounded-full h-2 relative overflow-hidden">
                                                <div
                                                    className="bg-[#3333CC] h-2 rounded-full transition-all duration-300 relative"
                                                    style={{ width: `${docSet.progress}%` }}
                                                >
                                                    <div className="absolute inset-0 bg-white opacity-30 animate-pulse"></div>
                                                </div>
                                            </div>
                                            <div className="text-xs text-gray-500 mt-2 space-y-2">
                                                <div className="flex justify-between items-center">
                                                    <span className="font-semibold">{docSet.progress}% complete</span>
                                                    <span className="text-gray-400">Processing...</span>
                                                </div>
                                                {docSet.current_step && (
                                                    <div className="text-gray-700 bg-white px-3 py-2 rounded border border-gray-200">
                                                        <div className="font-medium text-xs text-gray-600 mb-1">Current step:</div>
                                                        <div className="text-xs leading-relaxed">
                                                            {docSet.current_step}
                                                        </div>
                                                    </div>
                                                )}
                                                {/* Stage indicator */}
                                                <div className="flex items-center space-x-2 text-xs">
                                                    <div className={`w-2 h-2 rounded-full animate-pulse ${docSet.progress < 20 ? 'bg-blue-500' :
                                                        docSet.progress < 60 ? 'bg-orange-500' :
                                                            docSet.progress < 80 ? 'bg-green-500' :
                                                                'bg-indigo-500'
                                                        }`}></div>
                                                    <span className="text-gray-600 font-medium">
                                                        {docSet.progress < 20 ? 'Preparing documents' :
                                                            docSet.progress < 60 ? 'Parsing PDFs with Docling' :
                                                                docSet.progress < 80 ? 'Processing text' :
                                                                    'Creating vector index'}
                                                    </span>
                                                </div>
                                            </div>
                                        </div>
                                    )}

                                    {/* Action buttons */}
                                    <div className="mt-4 pt-3 border-t border-gray-100">
                                        {docSet.status === 'completed' ? (
                                            <div className="space-y-2">
                                                <div className="flex items-center justify-between">
                                                    <div className="text-xs text-green-600 font-medium flex items-center space-x-1">
                                                        <CheckCircle className="h-3 w-3" />
                                                        <span>Ready for Chat</span>
                                                    </div>
                                                    <div className="text-xs text-gray-500">
                                                        Fully indexed
                                                    </div>
                                                </div>
                                                <button
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        handleRebuildPipeline(docSet.name);
                                                    }}
                                                    disabled={rebuildingPipeline === docSet.name}
                                                    className="flex items-center space-x-1 text-xs bg-orange-600 text-white px-3 py-1 rounded hover:bg-orange-700 disabled:bg-gray-400 transition-colors w-full justify-center"
                                                >
                                                    {rebuildingPipeline === docSet.name ? (
                                                        <>
                                                            <div className="animate-spin rounded-full h-3 w-3 border-b border-white"></div>
                                                            <span>Rebuilding...</span>
                                                        </>
                                                    ) : (
                                                        <>
                                                            <RotateCcw className="h-3 w-3" />
                                                            <span>Complete Rebuild</span>
                                                        </>
                                                    )}
                                                </button>
                                            </div>
                                        ) : ['processing', 'parsing', 'indexing', 'pending'].includes(docSet.status) ? (
                                            <div className="space-y-2">
                                                <div className="flex items-center justify-between">
                                                    <div className="text-xs text-blue-600 font-medium flex items-center space-x-1">
                                                        <Clock className="h-3 w-3 animate-spin" />
                                                        <span>
                                                            {docSet.status === 'parsing' ? 'Parsing documents...' :
                                                                docSet.status === 'indexing' ? 'Creating search index...' :
                                                                    docSet.status === 'pending' ? 'Preparing...' :
                                                                        'Processing documents...'}
                                                        </span>
                                                    </div>
                                                    <div className="text-xs text-gray-500">
                                                        {docSet.progress && docSet.progress < 60 ? 'Please wait' : 'Almost done'}
                                                    </div>
                                                </div>
                                                {docSet.status === 'parsing' && docSet.progress && docSet.progress < 60 && (
                                                    <div className="text-xs text-orange-600 bg-orange-50 px-2 py-1 rounded">
                                                        ⏱️ PDF parsing may take several minutes
                                                    </div>
                                                )}
                                                {docSet.status === 'indexing' && (
                                                    <div className="text-xs text-green-600 bg-green-50 px-2 py-1 rounded">
                                                        🔍 Creating search embeddings...
                                                    </div>
                                                )}
                                            </div>
                                        ) : docSet.status === 'failed' ? (
                                            <div className="space-y-2">
                                                <div className="text-xs text-red-600 font-medium flex items-center space-x-1">
                                                    <AlertCircle className="h-3 w-3" />
                                                    <span>Processing Failed</span>
                                                </div>
                                                <button
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        handleStartPipeline(docSet.name);
                                                    }}
                                                    disabled={startingPipeline === docSet.name}
                                                    className="flex items-center space-x-1 text-xs bg-red-600 text-white px-3 py-1 rounded hover:bg-red-700 disabled:bg-gray-400 transition-colors"
                                                >
                                                    {startingPipeline === docSet.name ? (
                                                        <>
                                                            <div className="animate-spin rounded-full h-3 w-3 border-b border-white"></div>
                                                            <span>Retrying...</span>
                                                        </>
                                                    ) : (
                                                        <>
                                                            <Play className="h-3 w-3" />
                                                            <span>Retry</span>
                                                        </>
                                                    )}
                                                </button>
                                            </div>
                                        ) : (
                                            <div className="space-y-2">
                                                <div className="text-xs text-gray-600 font-medium">
                                                    Ready to process
                                                </div>
                                                <button
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        handleStartPipeline(docSet.name);
                                                    }}
                                                    disabled={startingPipeline === docSet.name}
                                                    className="flex items-center space-x-1 text-xs bg-[#3333CC] text-white px-3 py-1 rounded hover:bg-[#2929AA] disabled:bg-gray-400 transition-colors"
                                                >
                                                    {startingPipeline === docSet.name ? (
                                                        <>
                                                            <div className="animate-spin rounded-full h-3 w-3 border-b border-white"></div>
                                                            <span>Starting...</span>
                                                        </>
                                                    ) : (
                                                        <>
                                                            <Play className="h-3 w-3" />
                                                            <span>Process</span>
                                                        </>
                                                    )}
                                                </button>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
