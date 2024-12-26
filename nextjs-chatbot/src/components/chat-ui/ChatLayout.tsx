'use client'

import { useCallback, useState, useRef, useEffect } from "react";
import { MessageRole } from "@/types/MessageRoles";
import { Conversations } from "@/types";
import { ChatConversations } from "@/components/chat-ui/ChatConversations";
import { ChatInput } from "@/components/chat-ui/ChatInput";
import { ChatHeader } from "@/components/chat-ui/ChatHeader";
import { ConversationsSidebar } from "@/components/chat-ui/ConversationsSidebar";
import "@/styles/gradients.css";
import { useScrollToBottom } from "@/hooks/useScrollToBottom";
import { useSidebar } from "@/contexts/sidebar-context";
import { useIsMobile } from "@/hooks/use-mobile";

const BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_URL;

type Conversation = {
  id: string;
  title: string;
  createdAt: string;
};

function ChatLayout() {
  const isMobile = useIsMobile();
  const { isSidebarOpen, closeSidebar } = useSidebar();
  const chatConversationsContainerRef = useRef<HTMLDivElement>(null);
  const [isQuerying, setIsQuerying] = useState<boolean>(false);
  const [currentConversationId, setCurrentConversationId] = useState<string>("");
  const [storedConversations, setStoredConversations] = useState<Conversation[]>([]);
  const [chatConversations, setChatConversations] = useState<Conversations>([
    {
      id: "1",
      role: MessageRole.ASSISTANT,
      message:
        "Hello! I'm your Nexi Group assistant. I can help you with information about our services, products, and more. How can I assist you today?",
    },
  ]);
  const [containerRef, endRef] = useScrollToBottom<HTMLDivElement>();

  useEffect(() => {
    fetchConversations();
  }, []);

  const fetchConversations = async () => {
    try {
      const response = await fetch(`${BACKEND_URL}/api/conversations`);
      const data = await response.json();
      if (data.conversations) {
        setStoredConversations(data.conversations);
      }
    } catch (error) {
      console.error("Error fetching conversations:", error);
    }
  };

  const createNewChat = useCallback(() => {
    setChatConversations([
      {
        id: "1",
        role: MessageRole.ASSISTANT,
        message:
          "Hello! I'm your Nexi Group assistant. I can help you with information about our services, products, and more. How can I assist you today?",
      },
    ]);
    setCurrentConversationId("");
  }, []);

  const sendMessage = useCallback(async (data: string) => {
    setIsQuerying(true);
    try {
      setChatConversations((conversations) => [
        ...conversations,
        {
          id: (conversations.length + 1).toString(),
          role: MessageRole.USER,
          message: data,
        },
        {
          id: (conversations.length + 2).toString(),
          role: MessageRole.ASSISTANT,
          message: "",
        },
      ]);
  
      const res = await fetch(`${BACKEND_URL}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          query: data,
          conversation_id: currentConversationId,
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
            const token = jsonData.token; // Read the token key
  
            accumulatedText += token;
  
            setChatConversations((conversations) => {
              const lastMessageIndex = conversations.length - 1;
              const updatedConversations = [...conversations];
              updatedConversations[lastMessageIndex].message = accumulatedText;
              return updatedConversations;
            });
          }
        }
      }
    } catch (error) {
      console.error("Error sending message:", error);
    } finally {
      setIsQuerying(false);
    }
  }, [currentConversationId]);
  

  const loadConversation = async (conversationId: string) => {
    try {
      const response = await fetch(`${BACKEND_URL}/api/conversations/${conversationId}`);
      const data = await response.json();
      if (data.conversation?.messages) {
        setChatConversations(
          data.conversation.messages.map((msg: any) => ({
            id: msg.id,
            role: msg.role as MessageRole,
            message: msg.content,
          }))
        );
        setCurrentConversationId(conversationId);
      }
    } catch (error) {
      console.error("Error loading conversation:", error);
    }
  };

  return (
    <div className="flex min-h-screen flex-col">
      <ChatHeader onNewChat={createNewChat} />
      <div className="flex flex-1 flex-col lg:flex-row">
        <ConversationsSidebar
          conversations={storedConversations}
          currentId={currentConversationId}
          onNewChat={createNewChat}
          onSelectConversation={loadConversation}
          isSidebarOpen={isSidebarOpen}
          closeSidebar={closeSidebar}
        />
        {isMobile && isSidebarOpen && (
          <div
            className="fixed inset-0 z-20 bg-black/50"
            onClick={closeSidebar}
          />
        )}
        <main
          className="flex flex-1 flex-col nexi-gradient bg-opacity-400"
          ref={containerRef}
        >
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
              onSubmit={sendMessage}
              placeholder="Ask me anything about Nexi Group..."
            />
          </div>
        </main>
      </div>
    </div>
  );
}

export default ChatLayout;
