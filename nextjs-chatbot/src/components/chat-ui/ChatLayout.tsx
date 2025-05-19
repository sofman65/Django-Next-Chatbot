"use client";

import { useCallback, useState, useRef, useEffect } from "react";
import { MessageRole } from "@/types/MessageRoles";
import { Conversations } from "@/types";
import { ChatInput } from "@/components/chat-ui/ChatInput";
import { ChatConversations } from "@/components/chat-ui/ChatConversations";
import { ChatHeader } from "@/components/chat-ui/ChatHeader";
import { ConversationsSidebar } from "@/components/chat-ui/ConversationsSidebar";
import { SidebarToggle } from "@/components/chat-ui/sidebar-toggle";
import { useSidebar } from "@/components/ui/sidebar";
import { useAuth } from "@/contexts/auth-context";
import { useIsMobile } from "@/hooks/use-mobile";
import { useScrollToBottom } from "@/hooks/useScrollToBottom";
import { cn } from "@/lib/utils";
import "@/styles/gradients.css";

const BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_URL;

type Conversation = {
  id: string;
  title: string;
  createdAt: string;
};

const MODELS = [
  { label: "Mistral-7B", value: "mistralai/Mistral-7B-Instruct-v0.3" },
  { label: "GPT-3.5 Turbo", value: "gpt-3.5-turbo" },
  { label: "GPT-4", value: "gpt-4" },
];

function ChatLayout() {
  const isMobile = useIsMobile();
  const { openMobile, setOpenMobile } = useSidebar();
  const { isAuthenticated, logout, authState } = useAuth();
  const [accessToken, setAccessToken] = useState<string | null>(null);
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
  const [selectedModel, setSelectedModel] = useState(MODELS[2].value);

  const [containerRef, endRef] = useScrollToBottom<HTMLDivElement>();

  const fetchConversations = useCallback(async () => {
    try {
      const response = await fetch(`${BACKEND_URL}/api/conversations`, {
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${authState.accessToken}`,
        },
      });

      if (!response.ok) {
        throw new Error("Failed to fetch conversations");
      }

      const data = await response.json();
      if (data.conversations) {
        const sortedConversations = data.conversations.sort(
          (a: Conversation, b: Conversation) =>
            new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
        );
        setStoredConversations(sortedConversations);
      }
    } catch (error) {
      console.error("Error fetching conversations:", error);
      if ((error as any)?.response?.status === 401) {
        logout();
      }
    }
  }, [authState.accessToken, logout]);

  useEffect(() => {
    if (accessToken) {
      const token = localStorage.getItem('accessToken');
      setAccessToken(token);
      fetchConversations();
    }
  }, [accessToken, fetchConversations]);


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

  const sendMessage = useCallback(
    async (data: string) => {
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

        const res = await fetch(`${BACKEND_URL}/api/chat`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${accessToken}`,
          },
          body: JSON.stringify({
            query: data,
            conversation_id: currentConversationId,
            model: selectedModel,
          }),
        });

        if (!res.ok) {
          if (res.status === 401) {
            logout();
            return;
          }
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
    },
    [currentConversationId, accessToken, logout, selectedModel],
  );

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
    [sendMessage],
  );

  const loadConversation = async (conversationId: string) => {
    try {
      const response = await fetch(
        `${BACKEND_URL}/api/conversations/${conversationId}`,
        {
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${accessToken}`,
          },
        }
      );

      if (!response.ok) {
        throw new Error("Failed to load conversation");
      }

      const data = await response.json();
      if (data.messages) {
        setChatConversations(data.messages);
        setCurrentConversationId(conversationId);
      }
    } catch (error) {
      console.error("Error loading conversation:", error);
    }
  };

  return (
    <div className="flex h-screen overflow-hidden w-screen">
      {/* Sidebar */}
      <ConversationsSidebar
        conversations={storedConversations}
        currentId={currentConversationId}
        onNewChat={createNewChat}
        onSelectConversation={loadConversation}
        className={cn("w-[280px] border-r", isMobile ? "fixed inset-y-0 z-50" : "")}
        isSidebarOpen={openMobile}
        closeSidebar={() => setOpenMobile(false)}
        fetchConversations={fetchConversations}
      />

      {/* Main Content */}
      <div
        className="
flex flex-1 flex-col h-full min-w-0
"
      >
        <div className="flex items-center justify-between border-b p-4 bg-white">
          <ChatHeader onNewChat={createNewChat} />
          <select
            className="border rounded-md p-2 bg-white"
            value={selectedModel}
            onChange={(e) => setSelectedModel(e.target.value)}
          >
            {MODELS.map((model) => (
              <option key={model.value} value={model.value}>
                {model.label}
              </option>
            ))}
          </select>
        </div>

        <main
          className="flex-1 h-full w-full overflow-hidden relative "
          ref={containerRef}
        >
          <div className="absolute inset-0 overflow-y-auto py-4 px-4" ref={chatConversationsContainerRef}>
            <ChatConversations
              conversations={chatConversations}
              isQuerying={isQuerying}
              chatConversationsContainerRef={chatConversationsContainerRef}
            />
            <div ref={endRef} className="h-32" /> {/* Padding for input */}
          </div>

          <div className="absolute bottom-0 left-0 right-0 bg-white/80 backdrop-blur-sm border-t">
            <ChatInput disabled={isQuerying} onSubmit={sendMessage} placeholder="Type your message here..." />
          </div>
        </main>
      </div>

      {/* Mobile Overlay */}
      {isMobile && openMobile && (
        <div className="fixed inset-0 z-40 bg-black/50" onClick={() => setOpenMobile(false)} />
      )}
    </div>
  )
}

export default ChatLayout

