"use client";

import { useCallback, useState, useRef, useEffect } from "react";
import { MessageRole } from "@/types/MessageRoles";
import { Conversations } from "@/types";
import { ChatInput } from "@/components/chat-ui/ChatInput";
import { ChatConversations } from "@/components/chat-ui/ChatConversations";
import { ChatHeader } from "@/components/chat-ui/ChatHeader";
import { ConversationsSidebar } from "@/components/chat-ui/ConversationsSidebar";
import { useSidebar } from "@/components/ui/sidebar";
import { useAuth } from "@/contexts/auth-context";
import { useIsMobile } from "@/hooks/use-mobile";
import { useScrollToBottom } from "@/hooks/useScrollToBottom";
import { useRouter } from "next/navigation";
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

export default function ChatLayout() {
  const isMobile = useIsMobile();
  const { openMobile, setOpenMobile } = useSidebar();
  const { authState, refreshToken, logout, isAuthenticated, isLoading } = useAuth();
  const token = authState.accessToken;
  const [storedConversations, setStoredConversations] = useState<Conversation[]>([]);
  const [chatConversations, setChatConversations] = useState<Conversations>([
    {
      id: "1",
      role: MessageRole.ASSISTANT,
      message:
        "Hello! I'm your Nexi Group assistant. I can help you with information about our services, products, and more. How can I assist you today?",
    },
  ]);
  const [currentConversationId, setCurrentConversationId] = useState<string>("");
  const [isQuerying, setIsQuerying] = useState<boolean>(false);
  const [selectedModel, setSelectedModel] = useState(MODELS[2].value);

  const chatConversationsContainerRef = useRef<HTMLDivElement>(null);
  const [containerRef, endRef] = useScrollToBottom<HTMLDivElement>();



  // fetchWithAuth helper
  const fetchWithAuth = useCallback(
    async (input: RequestInfo, init: RequestInit = {}) => {
      if (!token) throw new Error("No access token");
      const doFetch = (t: string) =>
        fetch(input, {
          ...init,
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${t}`,
            ...(init.headers || {}),
          },
        });
      let res = await doFetch(token);
      if (res.status === 401) {
        await refreshToken();
        const newToken = localStorage.getItem("access")!;
        res = await doFetch(newToken);
        if (res.status === 401) {
          logout();
        }
      }
      return res;
    },
    [token, refreshToken, logout]
  );
  const router = useRouter();

  // Fetch conversations from backend
  const fetchConversations = useCallback(async () => {
    if (!token) return;
    try {
      const res = await fetchWithAuth(`${BACKEND_URL}/api/conversations/`);
      if (!res.ok) throw new Error("Failed to fetch conversations");
      const data = await res.json();
      if (data.conversations) {
        const sorted = data.conversations.sort(
          (a: Conversation, b: Conversation) =>
            new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
        );
        setStoredConversations(sorted);
      }
    } catch (e) {
      console.error(e);
    }
  }, [fetchWithAuth, token]);

  // On mount (and whenever token changes), load convos
  useEffect(() => {
    fetchConversations();
  }, [fetchConversations]);

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

      // Append user + placeholder assistant
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

      try {
        const res = await fetchWithAuth(`${BACKEND_URL}/api/chat/`, {
          method: "POST",
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
                const lastIndex = conversations.length - 1;
                const updated = [...conversations];
                updated[lastIndex] = {
                  ...updated[lastIndex],
                  message: accumulatedText,
                };
                return updated;
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
    [currentConversationId, fetchWithAuth, logout, selectedModel]
  );

  // const handleSubmit = useCallback(
  //   (value: string) => {
  //     setIsQuerying(true);
  //     setChatConversations((conversations) => [
  //       ...conversations,
  //       {
  //         id: (conversations.length + 1).toString(),
  //         role: MessageRole.USER,
  //         message: value,
  //       },
  //     ]);
  //     sendMessage(value).finally(() => {
  //       setIsQuerying(false);
  //     });
  //   },
  //   [sendMessage]
  // );

  const loadConversation = useCallback(
    async (id: string) => {
      if (!token) return;
      try {
        const res = await fetchWithAuth(`${BACKEND_URL}/api/conversations/${id}/`);
        if (!res.ok) throw new Error("Load conversation failed");
        const data = await res.json();
        if (data.messages) {
          setChatConversations(data.messages);
          setCurrentConversationId(id);
        }
      } catch (e) {
        console.error(e);
      }
    },
    [fetchWithAuth, token]
  );

  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      router.push("/login");
    }
  }, [isLoading, isAuthenticated, router]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <h1 className="text-2xl font-bold">Loading...</h1>
      </div>
    );
  }

  if (!isAuthenticated) {
    return (
      null
    );

  }
  // // Scroll to bottom when new messages are added
  // useEffect(() => {
  //   if (chatConversationsContainerRef.current) {
  //     chatConversationsContainerRef.current.scrollTop =
  //       chatConversationsContainerRef.current.scrollHeight;
  //   }
  // }, [chatConversations]);
  // // Handle mobile sidebar
  // useEffect(() => {
  //   const handleResize = () => {
  //     if (isMobile && openMobile) {
  //       setOpenMobile(false);
  //     }
  //   };
  //   window.addEventListener("resize", handleResize);
  //   return () => {
  //     window.removeEventListener("resize", handleResize);
  //   };
  // }, [isMobile, openMobile, setOpenMobile]);
  // Handle mobile sidebar close on route change
  // useEffect(() => {
  //   const handleRouteChange = () => {
  //     if (isMobile && openMobile) {
  //       setOpenMobile(false);
  //     }
  //   };
  //   router.events.on("routeChangeStart", handleRouteChange);
  //   return () => {
  //     router.events.off("routeChangeStart", handleRouteChange);
  //   };
  // }, [isMobile, openMobile, setOpenMobile, router.events]);





  return (
    <div className="flex h-screen overflow-hidden w-screen">
      {/* Sidebar */}
      <ConversationsSidebar
        conversations={storedConversations}
        currentId={currentConversationId}
        onNewChat={createNewChat}
        onSelectConversation={loadConversation}
        className="w-[280px] border-r lg:relative fixed inset-y-0 z-50 lg:inset-auto lg:z-auto"
        isSidebarOpen={openMobile}
        closeSidebar={() => setOpenMobile(false)}
      />

      {/* Main Content */}
      <div className="flex flex-1 flex-col h-full min-w-0">
        {/* Header + Model Select */}
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

        {/* Chat Area */}
        <main
          ref={containerRef}
          className="flex-1 h-full w-full overflow-hidden relative"
        >
          <div className="absolute inset-0 flex flex-col justify-between">
            {/* Messages (scrollable, centered) */}
            <div
              ref={chatConversationsContainerRef}
              className="overflow-y-auto py-4 px-2 md:px-4 w-full max-w-3xl mx-auto flex-1"
            >
              <ChatConversations
                conversations={chatConversations}
                isQuerying={isQuerying}
                chatConversationsContainerRef={chatConversationsContainerRef}
              />
              <div ref={endRef} className="h-32" />
            </div>

            {/* Input (centered under messages) */}
            <div className="w-full bg-white/80 backdrop-blur-sm border-t">
              <div className="max-w-3xl mx-auto">
                <ChatInput
                  disabled={isQuerying}
                  onSubmit={sendMessage}
                  placeholder="Type your message here..."
                />
              </div>
            </div>
          </div>
        </main>
      </div>

      {/* Mobile Overlay */}
      {isMobile && openMobile && (
        <div
          className="fixed inset-0 z-40 bg-black/50"
          onClick={() => setOpenMobile(false)}
        />
      )}
    </div>
  );
}
