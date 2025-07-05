"use client";

import { useState, useEffect } from "react";
import { X, AlertCircle, CheckCircle, Clock, ChevronDown, ChevronUp, Eye } from "lucide-react";
import { DocumentSet } from "./RAGLayout";

const BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_URL;

interface PipelineStatusProps {
    fetchWithAuth: (input: RequestInfo, init?: RequestInit) => Promise<Response>;
    documentSets: DocumentSet[];
    refreshTrigger: number;
    onStatusUpdate: () => void;
}

interface DetailedStatus {
    progress_percentage: number;
    current_step: string;
    status: string;
    started_at?: string;
    error_message?: string;
}

export function PipelineStatus({
    fetchWithAuth,
    documentSets,
    refreshTrigger,
    onStatusUpdate
}: PipelineStatusProps) {
    const [isVisible, setIsVisible] = useState(false);
    const [processingDocSets, setProcessingDocSets] = useState<DocumentSet[]>([]);
    const [detailedStatuses, setDetailedStatuses] = useState<{ [key: string]: DetailedStatus }>({});
    const [isExpanded, setIsExpanded] = useState(false);
    const [lastUpdate, setLastUpdate] = useState<Date>(new Date());

    // Pipeline stages configuration
    const pipelineStages = [
        { name: "Initialization", range: [0, 10], color: "bg-blue-500" },
        { name: "Document Preparation", range: [10, 20], color: "bg-purple-500" },
        { name: "PDF Parsing (Docling)", range: [20, 60], color: "bg-orange-500" },
        { name: "Document Processing", range: [60, 80], color: "bg-green-500" },
        { name: "Vector Indexing", range: [80, 100], color: "bg-indigo-500" }
    ];

    const getCurrentStage = (progress: number) => {
        return pipelineStages.find(stage =>
            progress >= stage.range[0] && progress <= stage.range[1]
        ) || pipelineStages[0];
    };

    const formatElapsedTime = (startTime: string) => {
        const start = new Date(startTime);
        const now = new Date();
        const diffMs = now.getTime() - start.getTime();
        const minutes = Math.floor(diffMs / 60000);
        const seconds = Math.floor((diffMs % 60000) / 1000);
        return `${minutes}m ${seconds}s`;
    };

    useEffect(() => {
        const processing = documentSets.filter(ds => ds.status === 'processing');
        setProcessingDocSets(processing);
        setIsVisible(processing.length > 0);

        // Auto-refresh status for processing document sets
        if (processing.length > 0) {
            const interval = setInterval(async () => {
                try {
                    const newDetailedStatuses: { [key: string]: DetailedStatus } = {};

                    for (const docSet of processing) {
                        const response = await fetchWithAuth(
                            `${BACKEND_URL}/api/rag/pipeline/status/${encodeURIComponent(docSet.name)}/`
                        );
                        if (response.ok) {
                            const data = await response.json();
                            newDetailedStatuses[docSet.name] = data;

                            // Update the document set status
                            if (data.status === 'completed' || data.status === 'failed') {
                                onStatusUpdate();
                            }
                        }
                    }

                    setDetailedStatuses(newDetailedStatuses);
                    setLastUpdate(new Date());
                } catch (error) {
                    console.error('Error checking pipeline status:', error);
                }
            }, 3000); // Check every 3 seconds

            return () => clearInterval(interval);
        }
    }, [documentSets, refreshTrigger, fetchWithAuth, onStatusUpdate]);

    if (!isVisible || processingDocSets.length === 0) {
        return null;
    }

    return (
        <div className="fixed bottom-4 right-4 z-50">
            <div className={`bg-slate-900/50 border border-white/10 rounded-2xl shadow-2xl transition-all duration-300 animate-float ${isExpanded ? 'w-96' : 'w-80'}`}>
                {/* Header */}
                <div className="flex items-center justify-between p-4 border-b border-white/10">
                    <div className="flex items-center space-x-2">
                        <h3 className="text-sm font-semibold text-white">Pipeline Status</h3>
                        <span className="text-xs bg-blue-400/20 text-blue-400 border border-blue-400/30 px-2 py-1 rounded-full">
                            {processingDocSets.length} active
                        </span>
                    </div>
                    <div className="flex items-center space-x-1">
                        <button
                            onClick={() => setIsExpanded(!isExpanded)}
                            className="text-slate-400 hover:text-white p-1 rounded transition-colors hover:scale-110"
                            title={isExpanded ? "Collapse details" : "Expand details"}
                        >
                            <Eye className="h-4 w-4" />
                        </button>
                        <button
                            onClick={() => setIsVisible(false)}
                            className="text-slate-400 hover:text-white p-1 rounded transition-colors hover:scale-110"
                        >
                            <X className="h-4 w-4" />
                        </button>
                    </div>
                </div>

                {/* Processing Document Sets */}
                <div className="p-4 space-y-4 max-h-96 overflow-y-auto custom-scrollbar">
                    {processingDocSets.map((docSet) => {
                        const detailStatus = detailedStatuses[docSet.name];
                        const progress = detailStatus?.progress_percentage || docSet.progress || 0;
                        const currentStage = getCurrentStage(progress);

                        return (
                            <div key={docSet.name} className="space-y-3 p-3 bg-slate-800/70 rounded-xl border border-white/10">
                                {/* Document Set Header */}
                                <div className="flex items-center justify-between">
                                    <div className="flex items-center space-x-2">
                                        <Clock className="h-4 w-4 text-blue-400 animate-spin" />
                                        <span className="text-sm font-medium text-white truncate">
                                            {docSet.name}
                                        </span>
                                    </div>
                                    {detailStatus?.started_at && (
                                        <span className="text-xs text-slate-400">
                                            {formatElapsedTime(detailStatus.started_at)}
                                        </span>
                                    )}
                                </div>

                                {/* Current Stage Indicator */}
                                <div className="flex items-center space-x-2 text-xs">
                                    <div className="w-3 h-3 rounded-full bg-blue-400 animate-pulse"></div>
                                    <span className="font-medium text-white">
                                        {currentStage.name}
                                    </span>
                                    <span className="text-slate-500">
                                        ({currentStage.range[0]}-{currentStage.range[1]}%)
                                    </span>
                                </div>

                                {/* Progress Bar */}
                                <div className="space-y-2">
                                    <div className="w-full bg-slate-700 rounded-full h-3 relative overflow-hidden">
                                        <div
                                            className={`${currentStage.color} h-3 rounded-full transition-all duration-500 relative`}
                                            style={{ width: `${progress}%` }}
                                        >
                                            <div className="absolute inset-0 bg-white opacity-30 animate-pulse"></div>
                                        </div>

                                        {/* Stage markers */}
                                        <div className="absolute inset-0 flex">
                                            {pipelineStages.slice(0, -1).map((stage, index) => (
                                                <div
                                                    key={index}
                                                    className="border-r border-slate-600"
                                                    style={{ width: `${stage.range[1]}%` }}
                                                ></div>
                                            ))}
                                        </div>
                                    </div>

                                    <div className="flex justify-between items-center text-xs">
                                        <span className="font-semibold text-white">
                                            {progress}% complete
                                        </span>
                                        <span className="text-slate-400">
                                            Updated {lastUpdate.toLocaleTimeString()}
                                        </span>
                                    </div>
                                </div>

                                {/* Current Step Details */}
                                <div className="bg-slate-900/70 p-3 rounded border border-slate-700">
                                    <div className="text-xs font-medium mb-1">
                                        <div className="text-xs font-medium text-blue-400 mb-1">
                                            Current Step:
                                        </div>
                                        <div className="text-sm text-white">
                                            {detailStatus?.current_step || docSet.current_step || "Initializing..."}
                                        </div>
                                    </div>

                                    {/* Expanded Details */}
                                    {isExpanded && (
                                        <div className="space-y-3 mt-3">
                                            {/* Stage Breakdown */}
                                            <div className="bg-slate-900/70 p-3 rounded border border-slate-700">
                                                <div className="text-xs font-medium text-blue-400 mb-2">
                                                    Processing Stages:
                                                </div>
                                                <div className="space-y-2">
                                                    {pipelineStages.map((stage, index) => {
                                                        const isActive = progress >= stage.range[0] && progress <= stage.range[1];
                                                        const isCompleted = progress > stage.range[1];

                                                        return (
                                                            <div key={index} className="flex items-center space-x-2 text-xs">
                                                                <div className={`w-2 h-2 rounded-full ${isCompleted ? 'bg-green-500' :
                                                                    isActive ? `${stage.color} animate-pulse` :
                                                                        'bg-slate-600'
                                                                    }`}></div>
                                                                <span className={`${isActive ? 'font-semibold text-white' :
                                                                    isCompleted ? 'text-green-400' :
                                                                        'text-slate-400'
                                                                    }`}>
                                                                    {stage.name}
                                                                </span>
                                                                <span className="text-slate-500">
                                                                    ({stage.range[0]}-{stage.range[1]}%)
                                                                </span>
                                                            </div>
                                                        );
                                                    })}
                                                </div>
                                            </div>

                                            {/* Technical Details */}
                                            <div className="bg-slate-900/70 p-3 rounded border border-slate-700">
                                                <div className="text-xs font-medium text-blue-400 mb-2">
                                                    Technical Details:
                                                </div>
                                                <div className="space-y-1 text-xs text-slate-400">
                                                    <div>Document Count: {docSet.document_count}</div>
                                                    <div>Status: {detailStatus?.status || docSet.status}</div>
                                                    {detailStatus?.started_at && (
                                                        <div>Started: {new Date(detailStatus.started_at).toLocaleString()}</div>
                                                    )}
                                                    {detailStatus?.error_message && (
                                                        <div className="text-red-400 font-medium">
                                                            Error: {detailStatus.error_message}
                                                        </div>
                                                    )}
                                                </div>
                                            </div>

                                            {/* Performance Notes */}
                                            <div className="bg-slate-800/70 p-3 rounded border border-slate-700">
                                                <div className="text-xs font-medium text-blue-400 mb-1">
                                                    💡 Performance Notes:
                                                </div>
                                                <ul className="text-xs text-slate-300 space-y-1">
                                                    <li>• PDF parsing (20-60%) takes the longest time</li>
                                                    <li>• Docling AI model processes each document sequentially</li>
                                                    <li>• Vector indexing (80-100%) is typically quick</li>
                                                    <li>• Total time varies by document count and complexity</li>
                                                </ul>
                                            </div>
                                        </div>
                                    )}
                                </div>
                            </div>
                        );
                    })}
                </div>

                {/* Footer */}
                <div className="p-3 border-t border-white/10 bg-slate-800/50 rounded-b-2xl">
                    <div className="flex items-center justify-between">
                        <div className="text-xs text-slate-400">
                            Auto-refresh every 3 seconds
                        </div>
                        <button
                            onClick={() => setIsExpanded(!isExpanded)}
                            className="text-xs text-blue-400 hover:text-blue-300 font-medium"
                        >
                            {isExpanded ? 'Show Less' : 'Show More'}
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}
