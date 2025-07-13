"use client";

import { useState, useRef, useEffect } from "react";
import { Send, Bot, User, FileText, XCircle } from "lucide-react";
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import BrandedLoading from "@/components/ui/branded-loading";
import { useAuth } from "@/contexts/auth-context";

const BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_URL;

interface RAGChatProps {
    selectedDocumentSet: string;
    fetchWithAuth: (input: RequestInfo, init?: RequestInit) => Promise<Response>;
    addToast: (toast: { type: 'success' | 'error'; title: string; message: string; duration?: number }) => void;
}

interface ChatMessage {
    id: string;
    role: 'user' | 'assistant';
    content: string;
    timestamp: Date;
    sources?: string[];
    metrics?: {
        chunks_used: number;
        total_chunks: number;
        completed: boolean;
    };
}

export function RAGChat({ selectedDocumentSet, fetchWithAuth, addToast }: RAGChatProps) {
    const { refreshToken } = useAuth();
    const [messages, setMessages] = useState<ChatMessage[]>([]);
    const [input, setInput] = useState("");
    const [isQuerying, setIsQuerying] = useState(false);
    const abortControllerRef = useRef<AbortController | null>(null);
    const messagesEndRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        setMessages([
            {
                id: 'initial-message',
                role: 'assistant',
                content: `Ready to answer questions about **${selectedDocumentSet}**.`,
                timestamp: new Date()
            }
        ]);
    }, [selectedDocumentSet]);

    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }, [messages]);

    const handleSendMessage = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!input.trim() || isQuerying) return;

        const userMessage: ChatMessage = {
            id: Date.now().toString(),
            role: 'user',
            content: input.trim(),
            timestamp: new Date()
        };

        setMessages(prev => [...prev, userMessage]);
        setInput("");
        setIsQuerying(true);

        abortControllerRef.current = new AbortController();
        const signal = abortControllerRef.current.signal;

        try {
            const doFetch = async (isRetry = false): Promise<Response> => {
                let token = localStorage.getItem("access");
                if (!token) throw new Error("No access token found.");

                const response = await fetchWithAuth(`${BACKEND_URL}/api/rag/chat/`, {
                    method: 'POST',
                    signal,
                    body: JSON.stringify({
                        query: userMessage.content,
                        document_set: selectedDocumentSet,
                        use_advanced_rag: true
                    }),
                });

                if (response.status === 401 && !isRetry) {
                    const newToken = await refreshToken();
                    if (!newToken) throw new Error("Session expired. Please log in again.");
                    localStorage.setItem("access", newToken);
                    return doFetch(true);
                }
                return response;
            };

            const response = await doFetch();

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.error || `HTTP error! status: ${response.status}`);
            }

            const reader = response.body?.getReader();
            if (!reader) throw new Error('Failed to read response stream.');

            const decoder = new TextDecoder();
            const assistantMessageId = (Date.now() + 1).toString();
            let assistantMessage: ChatMessage = {
                id: assistantMessageId,
                role: 'assistant',
                content: '',
                timestamp: new Date(),
                metrics: { chunks_used: 0, total_chunks: 0, completed: false },
                sources: [],
            };
            setMessages(prev => [...prev, assistantMessage]);

            while (true) {
                const { done, value } = await reader.read();
                if (done) break;

                const chunk = decoder.decode(value, { stream: true });
                const lines = chunk.split('\n').filter(line => line.trim());

                for (const line of lines) {
                    try {
                        const data = JSON.parse(line);
                        assistantMessage.content += data.token || '';
                        if (data.chunks_used) {
                            assistantMessage.metrics = {
                                chunks_used: data.chunks_used.length,
                                total_chunks: data.total_chunks_in_set,
                                completed: false,
                            };
                        }
                        if (data.sources) {
                            assistantMessage.sources = data.sources;
                        }
                        setMessages(prev => prev.map(m => m.id === assistantMessageId ? { ...assistantMessage } : m));
                    } catch (e) {
                        // Ignore non-JSON lines
                    }
                }
            }
            assistantMessage.metrics!.completed = true;
            setMessages(prev => prev.map(m => m.id === assistantMessageId ? { ...assistantMessage } : m));

        } catch (error: any) {
            if (error.name === 'AbortError') {
                addToast({ type: 'error', title: 'Request Cancelled', message: 'The chat request was cancelled.' });
            } else {
                addToast({ type: 'error', title: 'Chat Error', message: error.message });
                setMessages(prev => [...prev, { id: 'error', role: 'assistant', content: `Error: ${error.message}`, timestamp: new Date() }]);
            }
        } finally {
            setIsQuerying(false);
            abortControllerRef.current = null;
        }
    };

    const handleCancel = () => {
        if (abortControllerRef.current) {
            abortControllerRef.current.abort();
        }
    };

    if (!selectedDocumentSet) {
        return (
            <div className="flex items-center justify-center h-full text-center text-slate-400">
                <div>
                    <FileText className="w-12 h-12 mx-auto mb-4 text-slate-600" />
                    <h3 className="text-lg font-semibold">No Document Set Selected</h3>
                    <p>Please select a document set from the 'Documents' tab to begin chatting.</p>
                </div>
            </div>
        );
    }

    return (
        <div className="flex flex-col h-full max-w-4xl mx-auto bg-slate-950/50 rounded-lg border border-white/10">
            {/* Chat messages */}
            <div className="flex-1 overflow-y-auto p-6 space-y-6">
                {messages.map((message) => (
                    <div key={message.id} className={`flex items-start gap-4 ${message.role === 'user' ? 'justify-end' : ''}`}>
                        {message.role === 'assistant' && <Bot className="w-8 h-8 text-blue-400 flex-shrink-0" />}
                        <div className={`max-w-2xl px-5 py-3 rounded-2xl ${message.role === 'user' ? 'bg-blue-600 text-white' : 'bg-slate-800 text-slate-200'}`}>
                            <ReactMarkdown remarkPlugins={[remarkGfm]} className="prose prose-invert prose-sm max-w-none">
                                {message.content}
                            </ReactMarkdown>
                            {message.metrics && (
                                <div className="text-xs text-slate-500 mt-2 pt-2 border-t border-slate-700">
                                    {message.metrics.completed ? 'Final' : 'Intermediate'} metrics: {message.metrics.chunks_used} / {message.metrics.total_chunks} chunks used.
                                </div>
                            )}
                        </div>
                        {message.role === 'user' && <User className="w-8 h-8 text-slate-400 flex-shrink-0" />}
                    </div>
                ))}
                <div ref={messagesEndRef} />
            </div>

            {/* Chat input form */}
            <div className="p-4 border-t border-white/10">
                <form onSubmit={handleSendMessage} className="relative">
                    <textarea
                        value={input}
                        onChange={(e) => setInput(e.target.value)}
                        placeholder={`Ask a question about ${selectedDocumentSet}...`}
                        className="w-full bg-slate-800 border border-slate-700 rounded-lg p-3 pr-20 text-white resize-none focus:outline-none focus:ring-2 focus:ring-blue-500"
                        rows={1}
                        disabled={isQuerying}
                    />
                    {isQuerying ? (
                        <button
                            type="button"
                            onClick={handleCancel}
                            className="absolute right-3 top-1/2 -translate-y-1/2 p-2 bg-red-600 hover:bg-red-700 rounded-full text-white"
                            aria-label="Cancel request"
                        >
                            <XCircle className="w-5 h-5" />
                        </button>
                    ) : (
                        <button
                            type="submit"
                            disabled={!input.trim()}
                            className="absolute right-3 top-1/2 -translate-y-1/2 p-2 bg-blue-600 hover:bg-blue-700 rounded-full text-white disabled:bg-slate-600"
                            aria-label="Send message"
                        >
                            <Send className="w-5 h-5" />
                        </button>
                    )}
                </form>
            </div>
        </div>
    );
}
