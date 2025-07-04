"use client";

import { useState } from "react";
import { Settings, RotateCcw, Activity, Database, AlertTriangle } from "lucide-react";

const BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_URL;

interface AdminActionsProps {
    fetchWithAuth: (input: RequestInfo, init?: RequestInit) => Promise<Response>;
    onRefresh: () => void;
}

export function AdminActions({ fetchWithAuth, onRefresh }: AdminActionsProps) {
    const [loading, setLoading] = useState<string | null>(null);
    const [result, setResult] = useState<string>("");

    const runAction = async (action: string, payload: any = {}) => {
        setLoading(action);
        setResult("");

        try {
            let url: string;
            if (action === 'system-status') {
                url = `${BACKEND_URL}/api/rag/system/status/`;
            } else {
                url = `${BACKEND_URL}/api/rag/admin/${action}/`;
            }

            const response = await fetchWithAuth(url, {
                method: action === 'system-status' ? 'GET' : 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: action === 'system-status' ? undefined : JSON.stringify(payload),
            });

            const data = await response.json();

            if (response.ok) {
                if (action === 'system-status') {
                    setResult(`✅ Status: ${data.total_document_sets} sets, ${data.indexed_documents}/${data.total_documents} docs indexed`);
                } else {
                    setResult(`✅ ${data.message || 'Action completed successfully'}`);
                }
                onRefresh();
            } else {
                setResult(`❌ Error: ${data.error || 'Unknown error'}`);
            }
        } catch (error) {
            setResult(`❌ Error: ${error instanceof Error ? error.message : 'Unknown error'}`);
        } finally {
            setLoading(null);
        }
    };

    return (
        <div className="w-full max-w-4xl mx-auto">
            <div className="card-space rounded-2xl">
                <div className="p-6">
                    <div className="mb-6">
                        <h2 className="text-2xl font-bold text-stellar-white mb-2">System Administration</h2>
                        <p className="text-lunar-grey">Manage and monitor your RAG system components.</p>
                    </div>

                    <div className="grid gap-4 md:grid-cols-2">
                        <button
                            onClick={() => runAction('system-status')}
                            disabled={loading === 'system-status'}
                            className="flex items-center space-x-3 p-4 glass border border-blue-400/30 text-blue-400 rounded-xl hover:bg-blue-400/10 hover:scale-105 disabled:opacity-50 transition-all duration-200"
                        >
                            <Activity className="h-6 w-6" />
                            <div className="text-left">
                                <div className="font-medium text-stellar-white">{loading === 'system-status' ? 'Checking...' : 'System Status'}</div>
                                <div className="text-sm text-blue-400">Check overall system health</div>
                            </div>
                        </button>

                        <button
                            onClick={() => runAction('clear-logs')}
                            disabled={loading === 'clear-logs'}
                            className="flex items-center space-x-3 p-4 glass border border-yellow-400/30 text-yellow-400 rounded-xl hover:bg-yellow-400/10 hover:scale-105 disabled:opacity-50 transition-all duration-200"
                        >
                            <Database className="h-6 w-6" />
                            <div className="text-left">
                                <div className="font-medium text-stellar-white">{loading === 'clear-logs' ? 'Clearing...' : 'Clear Old Logs'}</div>
                                <div className="text-sm text-yellow-400">Remove old processing logs</div>
                            </div>
                        </button>

                        <button
                            onClick={() => runAction('restart-stuck-pipelines')}
                            disabled={loading === 'restart-stuck-pipelines'}
                            className="flex items-center space-x-3 p-4 glass border border-orange-400/30 text-orange-400 rounded-xl hover:bg-orange-400/10 hover:scale-105 disabled:opacity-50 transition-all duration-200"
                        >
                            <RotateCcw className="h-6 w-6" />
                            <div className="text-left">
                                <div className="font-medium text-stellar-white">{loading === 'restart-stuck-pipelines' ? 'Restarting...' : 'Restart Stuck Pipelines'}</div>
                                <div className="text-sm text-orange-400">Reset failed or stuck processing</div>
                            </div>
                        </button>

                        <button
                            onClick={() => {
                                if (confirm('This will reset ALL pipelines and clear ALL data. Are you sure?')) {
                                    runAction('force-cleanup', { confirm: true });
                                }
                            }}
                            disabled={loading === 'force-cleanup'}
                            className="flex items-center space-x-3 p-4 glass border border-red-400/30 text-red-400 rounded-xl hover:bg-red-400/10 hover:scale-105 disabled:opacity-50 transition-all duration-200"
                        >
                            <AlertTriangle className="h-6 w-6" />
                            <div className="text-left">
                                <div className="font-medium text-stellar-white">{loading === 'force-cleanup' ? 'Cleaning...' : 'Force Cleanup'}</div>
                                <div className="text-sm text-red-400">⚠️ Reset entire system</div>
                            </div>
                        </button>
                    </div>

                    {result && (
                        <div className="mt-6 p-4 glass-dark rounded-xl border border-white/10">
                            <h3 className="font-medium text-stellar-white mb-2">Action Result:</h3>
                            <div className="text-sm text-lunar-grey whitespace-pre-wrap">{result}</div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
