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
  const { accessToken, logout } = useAuth();
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

  useEffect(() => {
    fetchConversations();
  }, []);

  const fetchConversations = async () => {
    try {
      const response = await fetch(`${BACKEND_URL}/api/conversations`, {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      });
      const data = await response.json();
      if (data.conversations) {
        setStoredConversations(data.conversations);
      }
    } catch (error) {
      console.error("Error fetching conversations:", error);
      if ((error as any)?.response?.status === 401) {
        logout();
      }
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

  const sendMessage = useCallback(
    async (data: string) => {
      setIsQuerying(true);
      try {
        setChatConversations((conversations) => [
          ...conversations,
          {
            id: (conversations.length + 1).toString(),
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
            Authorization: `Bearer ${accessToken}`,
          },
        },
      );
      if (response.status === 401) {
        logout();
        return;
      }
      const data = await response.json();
      if (data.conversation?.messages) {
        setChatConversations(
          data.conversation.messages.map((msg: any) => ({
            id: msg.id,
            role: msg.role as MessageRole,
            message: msg.content,
          })),
        );
        setCurrentConversationId(conversationId);
      }
    } catch (error) {
      console.error("Error loading conversation:", error);
    }
  };

  return (
    <div className="flex-col md:flex-row lg: w-screen grid lg:grid-cols-[280px_1fr]">
      <ConversationsSidebar
        conversations={storedConversations}
        currentId={currentConversationId}
        onNewChat={createNewChat}
        onSelectConversation={loadConversation}
        className={cn(
          "fixed inset-y-0 z-30 hidden md:block lg:block",
          isMobile && (openMobile ? "block" : "hidden"),
        )}
        fetchConversations={fetchConversations}
      />
      <div className="flex flex-col w-full z-10">
        <div className="flex items-center justify-between p-2">
          <ChatHeader onNewChat={createNewChat} />
          {isMobile && <SidebarToggle />}
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
        <main className="relative flex-1 nexi-gradient" ref={containerRef}>
          <div
            className="h-full flex-col overflow-y-auto py-4"
            ref={chatConversationsContainerRef}
          >
            <div className="mx-auto w-full px-4">
              <ChatConversations
                conversations={chatConversations}
                isQuerying={isQuerying}
                chatConversationsContainerRef={chatConversationsContainerRef}
              />
            </div>
            <div ref={endRef} />
          </div>
          <div className="absolute inset-x-0 bottom-0 bg-white/80 backdrop-blur-sm">
            <div className="mx-auto w-full p-4">
              <ChatInput
                disabled={isQuerying}
                onSubmit={handleSubmit}
                placeholder="Ask me anything about Nexi Group..."
              />
            </div>
          </div>
        </main>
      </div>
      {isMobile && openMobile && (
        <div
          className="fixed inset-0 z-20 bg-black/50 transition-opacity md:hidden lg:hidden"
          onClick={() => setOpenMobile(false)}
        />
      )}
    </div>
  );
}

export default ChatLayout;
