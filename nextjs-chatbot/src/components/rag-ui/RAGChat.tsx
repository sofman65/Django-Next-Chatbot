"use client";

import { useState, useRef, useEffect } from "react";
import { Send, Bot, User, FileText } from "lucide-react";
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';

const BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_URL;

interface RAGChatProps {
    fetchWithAuth: (input: RequestInfo, init?: RequestInit) => Promise<Response>;
    documentSetName: string;
}

interface ChatMessage {
    id: string;
    role: 'user' | 'assistant';
    content: string;
    timestamp: Date;
    sources?: string[];
    metrics?: {
        chunks: number;
        length: number;
        completed: boolean;
    };
}

export function RAGChat({ fetchWithAuth, documentSetName }: RAGChatProps) {
    const [messages, setMessages] = useState<ChatMessage[]>([
        {
            id: '1',
            role: 'assistant',
            content: `Hello! I'm ready to help you with questions about the documents in "${documentSetName}". What would you like to know?`,
            timestamp: new Date()
        }
    ]);
    const [input, setInput] = useState("");
    const [isLoading, setIsLoading] = useState(false);
    const messagesEndRef = useRef<HTMLDivElement>(null);
    const textareaRef = useRef<HTMLTextAreaElement>(null);

    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    };

    useEffect(() => {
        scrollToBottom();
    }, [messages]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!input.trim() || isLoading) return;

        const userMessage: ChatMessage = {
            id: Date.now().toString(),
            role: 'user',
            content: input.trim(),
            timestamp: new Date()
        };

        setMessages(prev => [...prev, userMessage]);
        setInput("");
        setIsLoading(true);

        try {
            const response = await fetchWithAuth(`${BACKEND_URL}/api/rag/chat/`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    query: userMessage.content,
                    document_set: documentSetName,
                    use_advanced_rag: true
                }),
            });

            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }

            // Handle streaming response
            const reader = response.body?.getReader();
            if (!reader) {
                throw new Error('No response body');
            }

            const decoder = new TextDecoder();
            let assistantContent = '';
            let conversationId = '';
            let chunkCount = 0;
            let isCompleted = false;

            // Create assistant message placeholder
            const assistantMessageId = (Date.now() + 1).toString();
            const assistantMessage: ChatMessage = {
                id: assistantMessageId,
                role: 'assistant',
                content: '',
                timestamp: new Date(),
                sources: []
            };

            setMessages(prev => [...prev, assistantMessage]);

            while (true) {
                const { done, value } = await reader.read();
                if (done) break;

                const chunk = decoder.decode(value, { stream: true });
                const lines = chunk.split('\n');

                for (const line of lines) {
                    if (line.startsWith('data: ')) {
                        try {
                            const jsonStr = line.slice(6); // Remove 'data: ' prefix
                            if (jsonStr.trim()) {
                                const data = JSON.parse(jsonStr);

                                if (data.error) {
                                    throw new Error(data.error);
                                }

                                if (data.answer) {
                                    assistantContent += data.answer;
                                    chunkCount++;
                                    // Update the assistant message in real-time
                                    setMessages(prev => prev.map(msg =>
                                        msg.id === assistantMessageId
                                            ? { ...msg, content: assistantContent }
                                            : msg
                                    ));
                                }

                                if (data.completion) {
                                    isCompleted = true;
                                    console.log(`Response completed - Chunks: ${chunkCount}, Length: ${data.total_length}, Final length: ${assistantContent.length}`);

                                    // Update metrics
                                    setMessages(prev => prev.map(msg =>
                                        msg.id === assistantMessageId
                                            ? {
                                                ...msg,
                                                metrics: {
                                                    chunks: chunkCount,
                                                    length: assistantContent.length,
                                                    completed: true
                                                }
                                            }
                                            : msg
                                    ));
                                }

                                if (data.sources) {
                                    setMessages(prev => prev.map(msg =>
                                        msg.id === assistantMessageId
                                            ? { ...msg, sources: data.sources }
                                            : msg
                                    ));
                                }

                                if (data.conversation_id) {
                                    conversationId = data.conversation_id;
                                }
                            }
                        } catch (parseError) {
                            console.error('Error parsing streaming data:', parseError);
                        }
                    }
                }
            }

            // Final message update and validation
            if (!assistantContent) {
                setMessages(prev => prev.map(msg =>
                    msg.id === assistantMessageId
                        ? { ...msg, content: 'Sorry, I could not generate a response. Please try again.' }
                        : msg
                ));
            }

        } catch (error) {
            console.error('Error sending message:', error);
            const errorMessage: ChatMessage = {
                id: (Date.now() + 1).toString(),
                role: 'assistant',
                content: 'Sorry, I encountered an error while processing your request. Please try again.',
                timestamp: new Date()
            };
            setMessages(prev => [...prev, errorMessage]);
        } finally {
            setIsLoading(false);
        }
    };

    const handleKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            handleSubmit(e);
        }
    };

    const formatTime = (date: Date) => {
        return date.toLocaleTimeString('en-US', {
            hour: '2-digit',
            minute: '2-digit'
        });
    };

    return (
        <div className="flex flex-col h-full bg-space-black">
            {/* Document Set Header */}
            <div className="glass border-b border-white/10 px-6 py-4">
                <div className="flex items-center space-x-2">
                    <FileText className="h-5 w-5 text-blue-400" />
                    <h3 className="text-lg font-medium text-stellar-white">
                        Chatting with: {documentSetName}
                    </h3>
                </div>
            </div>

            {/* Messages */}
            <div className="flex-1 overflow-y-auto px-6 py-4 custom-scrollbar">
                <div className="max-w-4xl mx-auto space-y-6">
                    {messages.map((message) => (
                        <div key={message.id} className="flex space-x-4">
                            {/* Avatar */}
                            <div className={`flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center ${message.role === 'user'
                                ? 'glass border border-white/20'
                                : 'gradient-space'
                                }`}>
                                {message.role === 'user' ? (
                                    <User className="w-4 h-4 text-stellar-white" />
                                ) : (
                                    <Bot className="w-4 h-4 text-white" />
                                )}
                            </div>

                            {/* Message Content */}
                            <div className="flex-1 min-w-0">
                                <div className="flex items-center space-x-2 mb-1">
                                    <span className="text-sm font-medium text-stellar-white">
                                        {message.role === 'user' ? 'You' : 'Nexi Assistant'}
                                    </span>
                                    <span className="text-xs text-lunar-grey">
                                        {formatTime(message.timestamp)}
                                    </span>
                                </div>

                                <div className={`rounded-xl p-4 ${message.role === 'user'
                                    ? 'glass border border-white/20'
                                    : 'card-space'
                                    }`}>
                                    {message.role === 'assistant' ? (
                                        <ReactMarkdown
                                            remarkPlugins={[remarkGfm]}
                                            className="prose prose-sm max-w-none prose-p:mb-2 prose-ul:mb-2 prose-ol:mb-2 prose-invert"
                                        >
                                            {message.content}
                                        </ReactMarkdown>
                                    ) : (
                                        <p className="text-stellar-white whitespace-pre-wrap">{message.content}</p>
                                    )}

                                    {/* Sources */}
                                    {message.sources && message.sources.length > 0 && (
                                        <div className="mt-3 pt-3 border-t border-white/10">
                                            <p className="text-xs font-medium text-blue-400 mb-2">Sources:</p>
                                            <div className="space-y-1">
                                                {message.sources.map((source, index) => (
                                                    <div key={index} className="text-xs text-lunar-grey glass-dark px-2 py-1 rounded border border-white/10">
                                                        {source}
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                    )}

                                    {/* Response metrics for assistant messages */}
                                    {message.role === 'assistant' && message.metrics && (
                                        <div className="mt-2 pt-2 border-t border-white/10">
                                            <div className="flex items-center space-x-4 text-xs text-lunar-grey">
                                                <span className="flex items-center space-x-1">
                                                    <span className={`w-2 h-2 rounded-full ${message.metrics.completed ? 'bg-green-400' : 'bg-yellow-400'}`}></span>
                                                    <span>{message.metrics.completed ? 'Complete' : 'Partial'}</span>
                                                </span>
                                                <span>{message.metrics.length} chars</span>
                                                <span>{message.metrics.chunks} chunks</span>
                                            </div>
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>
                    ))}

                    {/* Loading indicator */}
                    {isLoading && (
                        <div className="flex space-x-4">
                            <div className="flex-shrink-0 w-8 h-8 rounded-full gradient-space flex items-center justify-center">
                                <Bot className="w-4 h-4 text-white" />
                            </div>
                            <div className="flex-1 min-w-0">
                                <div className="flex items-center space-x-2 mb-1">
                                    <span className="text-sm font-medium text-stellar-white">Nexi Assistant</span>
                                </div>
                                <div className="card-space rounded-xl p-4">
                                    <div className="flex items-center space-x-2">
                                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-400"></div>
                                        <span className="text-sm text-stellar-white">Thinking...</span>
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}

                    <div ref={messagesEndRef} />
                </div>
            </div>

            {/* Input Form */}
            <div className="glass border-t border-white/10 px-6 py-4">
                <div className="max-w-4xl mx-auto">
                    <form onSubmit={handleSubmit} className="flex space-x-4">
                        <div className="flex-1">
                            <textarea
                                ref={textareaRef}
                                value={input}
                                onChange={(e) => setInput(e.target.value)}
                                onKeyDown={handleKeyDown}
                                placeholder={`Ask a question about ${documentSetName}...`}
                                className="w-full px-4 py-3 glass border border-white/20 rounded-xl resize-none focus:outline-none focus:ring-2 focus:ring-blue-400 focus:border-blue-400 text-stellar-white placeholder-lunar-grey transition-all duration-200"
                                rows={1}
                                disabled={isLoading}
                                style={{
                                    minHeight: '48px',
                                    maxHeight: '120px',
                                    resize: 'none'
                                }}
                            />
                        </div>
                        <button
                            type="submit"
                            disabled={!input.trim() || isLoading}
                            className="btn-space px-6 py-3 rounded-xl font-medium text-stellar-white disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100 transition-all duration-200 hover:scale-105 flex items-center space-x-2"
                        >
                            <Send className="w-4 h-4" />
                            <span>Send</span>
                        </button>
                    </form>
                </div>
            </div>
        </div>
    );
}
