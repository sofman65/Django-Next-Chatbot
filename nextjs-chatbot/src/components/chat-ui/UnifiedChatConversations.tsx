import { useEffect } from "react";
import { ChatMessage } from "./ChatMessage";
import { Bot, User } from "lucide-react";
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { StreamingTextEffect } from "@/components/ui/streaming-text-effect";
import type { Conversations } from "../../types";

interface RAGMessage {
    id: string;
    role: 'user' | 'assistant';
    content: string;
    timestamp?: Date;
    sources?: string[];
    metrics?: {
        chunks: number;
        length: number;
        completed: boolean;
    };
}

interface UnifiedChatConversationsProps {
    regularConversations?: Conversations;
    ragMessages?: RAGMessage[];
    isQuerying: boolean;
    chatConversationsContainerRef: React.RefObject<HTMLDivElement>;
    isRagMode: boolean;
}

export function UnifiedChatConversations({
    regularConversations = [],
    ragMessages = [],
    isQuerying,
    chatConversationsContainerRef,
    isRagMode,
}: UnifiedChatConversationsProps) {
    useEffect(() => {
        if (chatConversationsContainerRef.current) {
            chatConversationsContainerRef.current.scrollTop =
                chatConversationsContainerRef.current.scrollHeight;
        }
    }, [regularConversations, ragMessages, chatConversationsContainerRef]);

    const formatTime = (date: Date) => {
        return date.toLocaleTimeString('en-US', {
            hour: '2-digit',
            minute: '2-digit'
        });
    };

    if (isRagMode) {
        return (
            <div className="flex w-full max-w-3xl flex-col space-y-6">
                {ragMessages.map((message, index) => (
                    <div key={message.id} className="flex space-x-4">
                        {/* Avatar */}
                        <div className={`flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center ${message.role === 'user'
                            ? 'bg-gradient-to-br from-gray-600 to-gray-800 shadow-gray-500/25'
                            : 'bg-gradient-to-br from-blue-500 to-blue-700 shadow-blue-500/25'
                            }`}>
                            {message.role === 'user' ? (
                                <User className="w-4 h-4 text-white" />
                            ) : (
                                <Bot className="w-4 h-4 text-white" />
                            )}
                        </div>

                        {/* Message Content */}
                        <div className="flex-1 min-w-0">
                            <div className="flex items-center space-x-2 mb-1">
                                <span className="text-sm font-medium text-white">
                                    {message.role === 'user' ? 'You' : 'Nexi Assistant'}
                                </span>
                                {message.timestamp && (
                                    <span className="text-xs text-gray-400">
                                        {formatTime(message.timestamp)}
                                    </span>
                                )}
                            </div>

                            <div className={`rounded-lg p-4 ${message.role === 'user'
                                ? 'bg-gray-800/50 border border-gray-700'
                                : 'bg-gray-900/50 border border-gray-600 shadow-sm'
                                }`}>
                                {message.role === 'assistant' ? (
                                    // Check if this is the last assistant message and we're currently querying
                                    isQuerying && index === ragMessages.length - 1 ? (
                                        <StreamingTextEffect
                                            text={message.content}
                                            isStreaming={true}
                                            className="text-white"
                                        />
                                    ) : (
                                        <ReactMarkdown
                                            remarkPlugins={[remarkGfm]}
                                            className="prose prose-sm max-w-none prose-p:mb-2 prose-ul:mb-2 prose-ol:mb-2 prose-invert text-white"
                                        >
                                            {message.content}
                                        </ReactMarkdown>
                                    )
                                ) : (
                                    <p className="text-white whitespace-pre-wrap">{message.content}</p>
                                )}

                                {/* Sources */}
                                {message.sources && message.sources.length > 0 && (
                                    <div className="mt-3 pt-3 border-t border-gray-600">
                                        <p className="text-xs font-medium text-gray-300 mb-2">Sources:</p>
                                        <div className="space-y-1">
                                            {message.sources.map((source, index) => (
                                                <div key={index} className="text-xs text-gray-400 bg-gray-800/50 px-2 py-1 rounded">
                                                    {source}
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                )}

                                {/* Response metrics for assistant messages */}
                                {message.role === 'assistant' && message.metrics && (
                                    <div className="mt-2 pt-2 border-t border-gray-600">
                                        <div className="flex items-center space-x-4 text-xs text-gray-400">
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

                {/* Loading indicator for RAG */}
                {isQuerying && (
                    <div className="flex space-x-4">
                        <div className="flex-shrink-0 w-8 h-8 rounded-full bg-[#3333CC] flex items-center justify-center">
                            <Bot className="w-4 h-4 text-white" />
                        </div>
                        <div className="flex-1 min-w-0">
                            <div className="flex items-center space-x-2 mb-1">
                                <span className="text-sm font-medium text-white">Nexi Assistant</span>
                            </div>
                            <div className="bg-gray-900/50 border border-gray-600 shadow-sm rounded-lg p-4">
                                <div className="flex items-center space-x-2">
                                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-[#3333CC]"></div>
                                    <span className="text-sm text-gray-300">Thinking...</span>
                                </div>
                            </div>
                        </div>
                    </div>
                )}
            </div>
        );
    }

    // Regular chat mode
    return (
        <div className="flex w-full max-w-3xl flex-col space-y-4">
            {regularConversations.map((conversation, index) => (
                <ChatMessage
                    key={conversation.id}
                    role={conversation.role}
                    message={conversation.message}
                    isStreaming={isQuerying && index === regularConversations.length - 1}
                />
            ))}
        </div>
    );
}
