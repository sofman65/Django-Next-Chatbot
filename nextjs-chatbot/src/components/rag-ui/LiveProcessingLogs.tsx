"use client";

import { useState, useEffect, useRef } from "react";
import { Terminal, ChevronDown, ChevronUp, X, Play, Pause } from "lucide-react";
import { DocumentSet } from "./RAGLayout";

const BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_URL;

interface LiveProcessingLogsProps {
    fetchWithAuth: (input: RequestInfo, init?: RequestInit) => Promise<Response>;
    documentSets: DocumentSet[];
    refreshTrigger: number;
}

interface LogEntry {
    timestamp: Date;
    docSetName: string;
    message: string;
    type: 'info' | 'progress' | 'warning' | 'error';
    progress?: number;
}

export function LiveProcessingLogs({
    fetchWithAuth,
    documentSets,
    refreshTrigger
}: LiveProcessingLogsProps) {
    const [isVisible, setIsVisible] = useState(false);
    const [isExpanded, setIsExpanded] = useState(false);
    const [logs, setLogs] = useState<LogEntry[]>([]);
    const [isPaused, setIsPaused] = useState(false);
    const logsEndRef = useRef<HTMLDivElement>(null);
    const [processingDocSets, setProcessingDocSets] = useState<DocumentSet[]>([]);

    // Auto-scroll to bottom when new logs are added
    const scrollToBottom = () => {
        if (!isPaused) {
            logsEndRef.current?.scrollIntoView({ behavior: "smooth" });
        }
    };

    useEffect(() => {
        scrollToBottom();
    }, [logs, isPaused]);

    useEffect(() => {
        const processing = documentSets.filter(ds => ds.status === 'processing');
        setProcessingDocSets(processing);
        setIsVisible(processing.length > 0);

        if (processing.length === 0) {
            // Clear logs when no processing is active
            setTimeout(() => setLogs([]), 5000);
        }

        // Auto-refresh status and generate log entries
        if (processing.length > 0) {
            const interval = setInterval(async () => {
                try {
                    for (const docSet of processing) {
                        const response = await fetchWithAuth(
                            `${BACKEND_URL}/api/rag/pipeline/status/${encodeURIComponent(docSet.name)}/`
                        );
                        if (response.ok) {
                            const data = await response.json();

                            // Generate log entries based on status
                            const newLogs: LogEntry[] = [];

                            if (data.current_step) {
                                const logEntry: LogEntry = {
                                    timestamp: new Date(),
                                    docSetName: docSet.name,
                                    message: data.current_step,
                                    type: data.progress_percentage >= 100 ? 'info' : 'progress',
                                    progress: data.progress_percentage
                                };

                                // Only add if it's different from the last log for this doc set
                                const lastLog = logs.filter(l => l.docSetName === docSet.name).pop();
                                if (!lastLog || lastLog.message !== data.current_step) {
                                    newLogs.push(logEntry);
                                }
                            }

                            if (newLogs.length > 0) {
                                setLogs(prev => [...prev, ...newLogs].slice(-100)); // Keep last 100 logs
                            }
                        }
                    }
                } catch (error) {
                    console.error('Error checking pipeline status:', error);
                }
            }, 3000); // Check every 3 seconds

            return () => clearInterval(interval);
        }
    }, [documentSets, refreshTrigger, logs, fetchWithAuth]);

    const formatTimestamp = (date: Date) => {
        return date.toLocaleTimeString('en-US', {
            hour12: false,
            hour: '2-digit',
            minute: '2-digit',
            second: '2-digit'
        });
    };

    const getLogIcon = (type: string) => {
        switch (type) {
            case 'progress':
                return '⚙️';
            case 'warning':
                return '⚠️';
            case 'error':
                return '❌';
            default:
                return '📄';
        }
    };

    const getLogColor = (type: string) => {
        switch (type) {
            case 'progress':
                return 'text-blue-400';
            case 'warning':
                return 'text-yellow-400';
            case 'error':
                return 'text-red-400';
            default:
                return 'text-slate-300';
        }
    };

    if (!isVisible || processingDocSets.length === 0) {
        return null;
    }

    return (
        <div className="w-full bg-slate-900 text-white shadow-lg border-b border-white/10">
            {/* Header */}
            <div className="flex items-center justify-between px-4 py-2 bg-slate-800 border-b border-white/10">
                <div className="flex items-center space-x-3">
                    <Terminal className="h-5 w-5 text-teal-400" />
                    <span className="font-mono text-sm font-semibold">Live Processing Logs</span>
                    <span className="text-xs bg-gradient-to-r from-blue-500 via-teal-500 to-emerald-500 text-white px-2 py-1 rounded-full">
                        {processingDocSets.length} active
                    </span>
                </div>
                <div className="flex items-center space-x-2">
                    <button
                        onClick={() => setIsPaused(!isPaused)}
                        className="text-slate-400 hover:text-white p-1 rounded"
                        title={isPaused ? "Resume auto-scroll" : "Pause auto-scroll"}
                    >
                        {isPaused ? <Play className="h-4 w-4" /> : <Pause className="h-4 w-4" />}
                    </button>
                    <button
                        onClick={() => setIsExpanded(!isExpanded)}
                        className="text-slate-400 hover:text-white p-1 rounded"
                        title={isExpanded ? "Collapse" : "Expand"}
                    >
                        {isExpanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                    </button>
                    <button
                        onClick={() => setIsVisible(false)}
                        className="text-slate-400 hover:text-white p-1 rounded"
                        title="Close"
                    >
                        <X className="h-4 w-4" />
                    </button>
                </div>
            </div>

            {/* Progress Summary */}
            <div className="px-4 py-2 bg-slate-850 border-b border-white/10">
                <div className="flex items-center space-x-6">
                    {processingDocSets.map((docSet) => (
                        <div key={docSet.name} className="flex items-center space-x-2">
                            <span className="text-sm font-mono text-slate-300">{docSet.name}:</span>
                            <div className="flex items-center space-x-1">
                                <div className="w-16 bg-slate-700 rounded h-1.5">
                                    <div
                                        className="bg-gradient-to-r from-blue-500 via-teal-500 to-emerald-500 h-1.5 rounded transition-all duration-300"
                                        style={{ width: `${docSet.progress || 0}%` }}
                                    ></div>
                                </div>
                                <span className="text-xs text-teal-400 font-mono">
                                    {docSet.progress || 0}%
                                </span>
                            </div>
                        </div>
                    ))}
                </div>
            </div>

            {/* Logs */}
            {isExpanded && (
                <div
                    className="px-4 py-2 max-h-64 overflow-y-auto bg-slate-900 font-mono text-xs"
                    style={{ maxHeight: isExpanded ? '16rem' : '0' }}
                >
                    {logs.length === 0 ? (
                        <div className="text-slate-500 italic py-4">
                            Waiting for processing logs...
                        </div>
                    ) : (
                        <div className="space-y-1">
                            {logs.map((log, index) => (
                                <div key={index} className="flex items-start space-x-2 py-1">
                                    <span className="text-slate-500 text-xs shrink-0">
                                        [{formatTimestamp(log.timestamp)}]
                                    </span>
                                    <span className="text-blue-400 shrink-0">
                                        {log.docSetName}:
                                    </span>
                                    <span className="text-xs">
                                        {getLogIcon(log.type)}
                                    </span>
                                    <span className={`${getLogColor(log.type)} leading-relaxed`}>
                                        {log.message}
                                        {log.progress !== undefined && (
                                            <span className="text-emerald-400 ml-2">
                                                [{log.progress}%]
                                            </span>
                                        )}
                                    </span>
                                </div>
                            ))}
                            <div ref={logsEndRef} />
                        </div>
                    )}
                </div>
            )}
        </div>
    );
}
