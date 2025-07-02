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
            <div className="bg-white rounded-lg shadow-sm border border-gray-200">
                <div className="p-6">
                    <div className="mb-6">
                        <h2 className="text-2xl font-bold text-gray-900 mb-2">System Administration</h2>
                        <p className="text-gray-600">Manage and monitor your RAG system components.</p>
                    </div>

                    <div className="grid gap-4 md:grid-cols-2">
                        <button
                            onClick={() => runAction('system-status')}
                            disabled={loading === 'system-status'}
                            className="flex items-center space-x-3 p-4 bg-blue-50 text-blue-700 rounded-lg hover:bg-blue-100 disabled:opacity-50 transition-colors"
                        >
                            <Activity className="h-6 w-6" />
                            <div className="text-left">
                                <div className="font-medium">{loading === 'system-status' ? 'Checking...' : 'System Status'}</div>
                                <div className="text-sm text-blue-600">Check overall system health</div>
                            </div>
                        </button>

                        <button
                            onClick={() => runAction('clear-logs')}
                            disabled={loading === 'clear-logs'}
                            className="flex items-center space-x-3 p-4 bg-yellow-50 text-yellow-700 rounded-lg hover:bg-yellow-100 disabled:opacity-50 transition-colors"
                        >
                            <Database className="h-6 w-6" />
                            <div className="text-left">
                                <div className="font-medium">{loading === 'clear-logs' ? 'Clearing...' : 'Clear Old Logs'}</div>
                                <div className="text-sm text-yellow-600">Remove old processing logs</div>
                            </div>
                        </button>

                        <button
                            onClick={() => runAction('restart-stuck-pipelines')}
                            disabled={loading === 'restart-stuck-pipelines'}
                            className="flex items-center space-x-3 p-4 bg-orange-50 text-orange-700 rounded-lg hover:bg-orange-100 disabled:opacity-50 transition-colors"
                        >
                            <RotateCcw className="h-6 w-6" />
                            <div className="text-left">
                                <div className="font-medium">{loading === 'restart-stuck-pipelines' ? 'Restarting...' : 'Restart Stuck Pipelines'}</div>
                                <div className="text-sm text-orange-600">Reset failed or stuck processing</div>
                            </div>
                        </button>

                        <button
                            onClick={() => {
                                if (confirm('This will reset ALL pipelines and clear ALL data. Are you sure?')) {
                                    runAction('force-cleanup', { confirm: true });
                                }
                            }}
                            disabled={loading === 'force-cleanup'}
                            className="flex items-center space-x-3 p-4 bg-red-50 text-red-700 rounded-lg hover:bg-red-100 disabled:opacity-50 transition-colors"
                        >
                            <AlertTriangle className="h-6 w-6" />
                            <div className="text-left">
                                <div className="font-medium">{loading === 'force-cleanup' ? 'Cleaning...' : 'Force Cleanup'}</div>
                                <div className="text-sm text-red-600">⚠️ Reset entire system</div>
                            </div>
                        </button>
                    </div>

                    {result && (
                        <div className="mt-6 p-4 bg-gray-50 rounded-lg">
                            <h3 className="font-medium text-gray-900 mb-2">Action Result:</h3>
                            <div className="text-sm text-gray-700 whitespace-pre-wrap">{result}</div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
