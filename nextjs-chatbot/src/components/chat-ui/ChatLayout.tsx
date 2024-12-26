'use client'
import { useCallback, useState, useRef, useEffect } from "react";
import { MessageRole } from "@/types/MessageRoles";
import { Conversations } from "@/types";
import { ChatUI } from "@/components/chat-ui/ChatUI";
import { ChatInput } from "@/components/chat-ui/ChatInput";
import { ChatConversations } from "@/components/chat-ui/ChatConversations";
import { ChatHeader} from "@/components/chat-ui/ChatHeader";
// import { ConversationsSidebar } from "@/components/chat-ui/ConversationSidebar"
import { SidebarProvider, useSidebar } from "@/contexts/sidebar-context"
import "@/styles/gradients.css"
import { cn } from "@/lib/utils"
import React from 'react';
import { useScrollToBottom } from '@/hooks/useScrollToBottom';
import { ChatMessage } from './ChatMessage';
import { Suggestion } from '@/components/ui/suggestion';
import { UISuggestion } from "@/lib/suggestions";
import { ConversationsSidebar } from "./ConversationsSidebar";
import { useIsMobile } from '@/hooks/use-mobile';

const BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_URL

// Define the Conversation type with required properties
type Conversation = {
  id: string;
  role: MessageRole;
  message: string;
  title: string;
  createdAt: string;
};

function ChatLayout() {
  const isMobile = useIsMobile();
  const { isSidebarOpen, closeSidebar } = useSidebar()
  const chatConversationsContainerRef = useRef<HTMLDivElement>(null)
  const [isQuerying, setIsQuerying] = useState<boolean>(false)
  const [currentConversationId, setCurrentConversationId] = useState<string>("")
  const [storedConversations, setStoredConversations] = useState<Conversation[]>([
    {
      id: "1",
      role: MessageRole.ASSISTANT,
      message: "Welcome to the chat!",
      title: "Initial Conversation",
      createdAt: new Date().toISOString(),
    },
    // Add more conversations as needed
  ])
  const [chatConversations, setChatConversations] = useState<Conversations>([
    {
      id: "1",
      role: MessageRole.ASSISTANT,
      message:
        "Hello! I'm your Nexi Group assistant. I can help you with information about our services, products, and more. How can I assist you today?",
    },
  ])
//   const [suggestions, setSuggestions] = useState<UISuggestion[]>([]);
  const [containerRef, endRef] = useScrollToBottom<HTMLDivElement>();

   // Hardcoded suggestions for testing
   const suggestions: UISuggestion[] = [
    {
      id: '1',
      originalText: 'What are your services?',
      suggestedText: 'What services do you offer?',
      selectionStart: 0,
      selectionEnd: 0,
      description: 'Ask about services',
    },
    {
      id: '2',
      originalText: 'Tell me about your products.',
      suggestedText: 'Can you describe your products?',
      selectionStart: 0,
      selectionEnd: 0,
      description: 'Inquire about products',
    },
    {
      id: '3',
      originalText: 'How can I contact support?',
      suggestedText: 'What is the best way to contact support?',
      selectionStart: 0,
      selectionEnd: 0,
      description: 'Get support contact info',
    },
  ];

  useEffect(() => {
    fetchConversations()
  }, [])

  const fetchConversations = async () => {
    try {
      const response = await fetch(`${BACKEND_URL}/conversations`)
      const data = await response.json()
      setStoredConversations(data.conversations)
    } catch (error) {
      console.error("Error fetching conversations:", error)
    }
  }

//   const fetchSuggestions = async (query: string) => {
//     try {
//       const response = await fetch(`${BACKEND_URL}/suggestions?query=${query}`);
//       const data = await response.json();
//       setSuggestions(data.suggestions);
//     } catch (error) {
//       console.error("Error fetching suggestions:", error);
//     }
//   };

  const createNewChat = useCallback(() => {
    setChatConversations([
      {
        id: "1",
        role: MessageRole.ASSISTANT,
        message:
          "Hello! I'm your Nexi Group assistant. I can help you with information about our services, products, and more. How can I assist you today?",
      },
    ])
    setCurrentConversationId("")
  }, [])

  const sendMessage = useCallback(async (data: string) => {
    setIsQuerying(true);
    try {
      // Add empty assistant message immediately to show loading state
      setChatConversations((conversations) => [
        ...conversations,
        {
          id: (conversations.length + 1).toString(),
          role: MessageRole.ASSISTANT,
          message: "",  // Empty message will trigger loading state
        },
      ]);

      const res = await fetch(`${BACKEND_URL}`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ 
          query: data,
          conversation_id: currentConversationId 
        }),
      });

      if (!res.ok) {
        throw new Error("Response error");
      }

      const reader = res.body?.getReader();
      if (!reader) return;

      const decoder = new TextDecoder();
      let accumulatedText = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        const chunk = decoder.decode(value, { stream: true });
        const lines = chunk.trim().split("\n");

        for (let line of lines) {
          if (line.startsWith("data: ")) {
            const jsonData = JSON.parse(line.substring(6));
            const token = jsonData.answer;

            accumulatedText += token;

            setChatConversations((conversations) => {
              const lastMessageIndex = conversations.length - 1;
              const updatedConversations = [...conversations];
              updatedConversations[lastMessageIndex] = {
                ...updatedConversations[lastMessageIndex],
                message: accumulatedText,
              };
              return updatedConversations;
            });
          }
        }
      }
    } catch (error) {
      console.error("Error:", error);
    } finally {
      setIsQuerying(false);
    }
  }, [currentConversationId]);

  const handleSubmit = useCallback(
    (value: string) => {
      setIsQuerying(true);
      setChatConversations((conversations) => [
        ...conversations,
        {
          id: (conversations.length + 1).toString(),
          role: MessageRole.USER,
          message: value,
        },
      ]);

      sendMessage(value).finally(() => {
        setIsQuerying(false);
      });
    },
    [sendMessage]
  );

//   const handleInputChange = (value: string) => {
//     fetchSuggestions(value);
//   };

  return (
    <div className="flex min-h-screen flex-col">
      <ChatHeader onNewChat={createNewChat} />
      <div className="flex flex-1 flex-col lg:flex-row">
        <ConversationsSidebar
          conversations={storedConversations}
          currentId={currentConversationId}
          onNewChat={createNewChat}
          className={cn(
            "transition-transform duration-300 ease-in-out",
            isMobile ? (
              isSidebarOpen ? "translate-x-0" : "-translate-x-full"
            ) : "translate-x-0"
          )}    
        />
        {/* Overlay for mobile */}
        {isMobile && isSidebarOpen && (
          <div
            className="fixed inset-0 z-20 bg-black/80 transition-opacity"
            onClick={closeSidebar}
          />
        )}
        <main className={cn(
          "flex flex-1 flex-col nexi-gradient bg-opacity-400",
          isMobile && "w-full"
        )} ref={containerRef}>
          <div 
            className="flex-1 overflow-y-auto py-4 backdrop-blur-sm" 
            ref={chatConversationsContainerRef}
          >
            <ChatConversations
              conversations={chatConversations}
              isQuerying={isQuerying}
              chatConversationsContainerRef={chatConversationsContainerRef}
            />
            <div ref={endRef} />
          </div>
          <div className="border-t rounded-lg bg-white backdrop-blur-sm">
            <ChatInput
              disabled={isQuerying}
              onSubmit={handleSubmit}
              placeholder="Ask me anything about Nexi Group..."
            />
          </div>
        </main>
      </div>
    </div>
  )
}

export default ChatLayout; 