"use client"

import { useCallback, useState, useRef, useEffect } from "react"
import { MessageRole } from "@/types/MessageRoles"
import type { Conversations } from "@/types"
import { ChatInput } from "@/components/chat-ui/ChatInput"
import { UnifiedChatConversations } from "@/components/chat-ui/UnifiedChatConversations"
import { ChatHeader } from "@/components/chat-ui/ChatHeader"
import { ConversationsSidebar } from "@/components/chat-ui/ConversationsSidebar"
import { DocumentSetSelector } from "@/components/chat-ui/DocumentSetSelector"
import { useSidebar } from "@/components/ui/sidebar"
import { useAuth } from "@/contexts/auth-context"
import { useIsMobile } from "@/hooks/use-mobile"
import { useScrollToBottom } from "@/hooks/useScrollToBottom"
import { useRouter } from "next/navigation"
import { ExternalLink, Sparkles } from "lucide-react"
import Link from "next/link"

const BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_URL

type Conversation = {
  id: string
  title: string
  createdAt: string
}

interface ChatMessage {
  id: string
  role: "user" | "assistant"
  content: string
  timestamp?: Date
  sources?: string[]
  metrics?: {
    chunks: number
    length: number
    completed: boolean
  }
}

export default function ChatLayout() {
  const isMobile = useIsMobile()
  const { openMobile, setOpenMobile } = useSidebar()
  const { authState, refreshToken, logout, isAuthenticated, isLoading } = useAuth()
  const token = authState.accessToken
  const [storedConversations, setStoredConversations] = useState<Conversation[]>([])
  const [chatConversations, setChatConversations] = useState<Conversations>([
    {
      id: "1",
      role: MessageRole.ASSISTANT,
      message:
        "Hello! I'm your Dochat.ai assistant. I can help you with document analysis, answer questions about your files, or have general conversations. How can I assist you today?",
    },
  ])
  const [currentConversationId, setCurrentConversationId] = useState<string>("")
  const [isQuerying, setIsQuerying] = useState<boolean>(false)
  const [selectedDocumentSet, setSelectedDocumentSet] = useState<string | null>(null)
  const [ragMessages, setRagMessages] = useState<ChatMessage[]>([])

  const chatConversationsContainerRef = useRef<HTMLDivElement>(null)
  const [containerRef, endRef] = useScrollToBottom<HTMLDivElement>()
  const MODELS = [
    { label: "Mistral-7B", value: "mistralai/Mistral-7B-Instruct-v0.3" },
    { label: "GPT-3.5 Turbo", value: "gpt-3.5-turbo" },
    { label: "GPT-4", value: "gpt-4" },
  ]
  const [selectedModel, setSelectedModel] = useState(MODELS[0].value)

  // fetchWithAuth helper
  const fetchWithAuth = useCallback(
    async (input: RequestInfo, init: RequestInit = {}) => {
      if (!token) throw new Error("No access token")
      const doFetch = (t: string) =>
        fetch(input, {
          ...init,
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${t}`,
            ...(init.headers || {}),
          },
        })
      let res = await doFetch(token)
      if (res.status === 401) {
        await refreshToken()
        const newToken = localStorage.getItem("access")!
        res = await doFetch(newToken)
        if (res.status === 401) {
          logout()
        }
      }
      return res
    },
    [token, refreshToken, logout],
  )
  const router = useRouter()

  // Fetch conversations from backend
  const fetchConversations = useCallback(async () => {
    if (!token) return
    try {
      const res = await fetchWithAuth(`${BACKEND_URL}/api/conversations/`)
      if (!res.ok) throw new Error("Failed to fetch conversations")
      const data = await res.json()
      if (data.conversations) {
        const sorted = data.conversations.sort(
          (a: Conversation, b: Conversation) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
        )
        setStoredConversations(sorted)
      }
    } catch (e) {
      console.error(e)
    }
  }, [fetchWithAuth, token])

  // On mount (and whenever token changes), load convos
  useEffect(() => {
    fetchConversations()
  }, [fetchConversations])

  // Initialize RAG messages when document set is selected
  useEffect(() => {
    if (selectedDocumentSet && ragMessages.length === 0) {
      setRagMessages([
        {
          id: "1",
          role: "assistant",
          content: `Hello! I'm ready to help you with questions about the documents in "${selectedDocumentSet}". What would you like to know?`,
          timestamp: new Date(),
        },
      ])
    }
  }, [selectedDocumentSet, ragMessages.length])

  const createNewChat = useCallback(() => {
    if (selectedDocumentSet) {
      // Reset RAG messages
      setRagMessages([
        {
          id: "1",
          role: "assistant",
          content: `Hello! I'm ready to help you with questions about the documents in "${selectedDocumentSet}". What would you like to know?`,
          timestamp: new Date(),
        },
      ])
    } else {
      // Reset regular chat
      setChatConversations([
        {
          id: "1",
          role: MessageRole.ASSISTANT,
          message:
            "Hello! I'm your Dochat.ai assistant. I can help you with document analysis, answer questions about your files, or have general conversations. How can I assist you today?",
        },
      ])
    }
    setCurrentConversationId("")
  }, [selectedDocumentSet])

  const sendMessage = useCallback(
    async (data: string) => {
      setIsQuerying(true)

      try {
        if (selectedDocumentSet) {
          // RAG mode - call RAG endpoint
          const userMessage: ChatMessage = {
            id: `user-${Date.now()}`,
            role: "user",
            content: data,
            timestamp: new Date(),
          }

          setRagMessages(prev => [...prev, userMessage])

          const response = await fetchWithAuth(`${BACKEND_URL}/api/rag/chat/`, {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              query: data,
              document_set_name: selectedDocumentSet,
            }),
          })

          if (!response.ok) {
            throw new Error(`RAG API call failed: ${response.statusText}`)
          }

          // Handle streaming response
          const reader = response.body?.getReader()
          const decoder = new TextDecoder()
          let assistantMessage = ""
          let sources: string[] = []
          let metrics = { chunks: 0, length: 0, completed: false }

          if (reader) {
            const assistantMessageObj: ChatMessage = {
              id: `assistant-${Date.now()}`,
              role: "assistant",
              content: "",
              timestamp: new Date(),
              sources: [],
              metrics: { chunks: 0, length: 0, completed: false },
            }
            setRagMessages(prev => [...prev, assistantMessageObj])

            try {
              while (true) {
                const { done, value } = await reader.read()
                if (done) break

                const chunk = decoder.decode(value)
                const lines = chunk.split('\n')

                for (const line of lines) {
                  if (line.startsWith('data: ')) {
                    try {
                      const data = JSON.parse(line.slice(6))

                      if (data.answer) {
                        assistantMessage += data.answer
                        setRagMessages(prev =>
                          prev.map((msg, index) =>
                            index === prev.length - 1
                              ? { ...msg, content: assistantMessage }
                              : msg
                          )
                        )
                      }

                      if (data.sources) {
                        sources = data.sources
                      }

                      if (data.completion) {
                        metrics = { chunks: data.chunks_used || 0, length: assistantMessage.length, completed: true }
                        setRagMessages(prev =>
                          prev.map((msg, index) =>
                            index === prev.length - 1
                              ? { ...msg, sources, metrics }
                              : msg
                          )
                        )
                      }

                      if (data.error) {
                        throw new Error(data.error)
                      }
                    } catch (e) {
                      console.warn("Failed to parse streaming data:", e)
                    }
                  }
                }
              }
            } catch (error) {
              console.error("Error reading RAG stream:", error)
              throw error
            }
          }
        } else {
          // Regular chat mode - call regular chat endpoint
          const userMessage = {
            id: `user-${Date.now()}`,
            role: MessageRole.USER,
            message: data,
          }

          setChatConversations(prev => [...prev, userMessage])

          const response = await fetchWithAuth(`${BACKEND_URL}/api/chat/`, {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              query: data,
              conversation_id: currentConversationId || null,
              model: selectedModel,
            }),
          })

          if (!response.ok) {
            throw new Error(`Chat API call failed: ${response.statusText}`)
          }

          // Handle streaming response
          const reader = response.body?.getReader()
          const decoder = new TextDecoder()
          let assistantMessage = ""

          if (reader) {
            const assistantMessageObj = {
              id: `assistant-${Date.now()}`,
              role: MessageRole.ASSISTANT,
              message: "",
            }
            setChatConversations(prev => [...prev, assistantMessageObj])

            try {
              while (true) {
                const { done, value } = await reader.read()
                if (done) break

                const chunk = decoder.decode(value)
                const lines = chunk.split('\n')

                for (const line of lines) {
                  if (line.startsWith('data: ')) {
                    try {
                      const data = JSON.parse(line.slice(6))
                      if (data.answer) {
                        assistantMessage += data.answer
                        setChatConversations(prev =>
                          prev.map((msg, index) =>
                            index === prev.length - 1
                              ? { ...msg, message: assistantMessage }
                              : msg
                          )
                        )
                      }
                    } catch (e) {
                      console.warn("Failed to parse streaming data:", e)
                    }
                  }
                }
              }
            } catch (error) {
              console.error("Error reading stream:", error)
            }
          }
        }
      } catch (error) {
        console.error("Error sending message:", error)

        // Add error message to chat
        if (selectedDocumentSet) {
          const errorMessage: ChatMessage = {
            id: `error-${Date.now()}`,
            role: "assistant",
            content: "Sorry, there was an error processing your request. Please try again.",
            timestamp: new Date(),
          }
          setRagMessages(prev => [...prev, errorMessage])
        } else {
          const errorMessage = {
            id: `error-${Date.now()}`,
            role: MessageRole.ASSISTANT,
            message: "Sorry, there was an error processing your request. Please try again.",
          }
          setChatConversations(prev => [...prev, errorMessage])
        }
      } finally {
        setIsQuerying(false)
      }
    },
    [selectedDocumentSet, fetchWithAuth, currentConversationId, selectedModel],
  )

  const loadConversation = useCallback(
    async (id: string) => {
      if (!token) return
      try {
        const res = await fetchWithAuth(`${BACKEND_URL}/api/conversations/${id}/`)
        if (!res.ok) throw new Error("Load conversation failed")
        const data = await res.json()
        if (data.messages) {
          setChatConversations(data.messages)
          setCurrentConversationId(id)
        }
      } catch (e) {
        console.error(e)
      }
    },
    [fetchWithAuth, token],
  )

  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      router.push("/login")
    }
  }, [isLoading, isAuthenticated, router])

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-screen bg-black">
        <div className="text-center">
          <div className="loading-dots mb-4">
            <div></div>
            <div></div>
            <div></div>
          </div>
          <h1 className="text-2xl font-bold text-white">Loading Dochat.ai...</h1>
          <p className="text-gray-400 mt-2">Preparing your AI assistant</p>
        </div>
      </div>
    )
  }

  if (!isAuthenticated) {
    return null
  }

  return (
    <div className="flex h-screen overflow-hidden w-screen bg-black">
      {/* Sidebar */}
      <ConversationsSidebar
        conversations={storedConversations}
        currentId={currentConversationId}
        onNewChat={createNewChat}
        onSelectConversation={loadConversation}
        className="w-[320px]"
        isSidebarOpen={openMobile}
        closeSidebar={() => setOpenMobile(false)}
      />

      {/* Main Content */}
      <div className="flex flex-1 flex-col h-full min-w-0">
        {/* Header */}
        <ChatHeader onToggleSidebar={() => setOpenMobile(!openMobile)} isSidebarOpen={openMobile} />

        {/* Document Set Selector Bar */}
        <div className="bg-gray-900/50 backdrop-blur-sm border-b border-gray-800 px-6 py-4">
          <div className="max-w-4xl mx-auto flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <DocumentSetSelector
                fetchWithAuth={fetchWithAuth}
                selectedDocumentSet={selectedDocumentSet}
                onSelectDocumentSet={(setName) => {
                  setSelectedDocumentSet(setName)
                  setCurrentConversationId("")
                }}
              />

              <div className="flex items-center space-x-2">
                {selectedDocumentSet ? (
                  <div className="flex items-center space-x-2 px-3 py-1 bg-blue-500/20 border border-blue-500/30 rounded-full">
                    <Sparkles className="w-4 h-4 text-blue-400" />
                    <span className="text-sm text-blue-300 font-medium">RAG Mode: {selectedDocumentSet}</span>
                  </div>
                ) : (
                  <div className="flex items-center space-x-2 px-3 py-1 bg-gray-800/50 border border-gray-700 rounded-full">
                    <span className="text-sm text-gray-400">General Chat Mode</span>
                  </div>
                )}
              </div>
            </div>

            <a
              href="/rag"
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center space-x-2 text-sm text-blue-400 hover:text-blue-300 font-medium transition-colors group"
            >
              {/* <Link href="/rag" className="flex items-center space-x-2" /> */}
              <span>Manage Documents</span>
              <ExternalLink className="w-4 h-4 group-hover:translate-x-0.5 transition-transform" />
            </a>
          </div>
        </div>

        {/* Chat Area */}
        <main ref={containerRef} className="flex-1 h-full w-full flex flex-col overflow-hidden">
          {/* Messages */}
          <div
            ref={chatConversationsContainerRef}
            className="flex-1 overflow-y-auto py-6 px-4 w-full max-w-4xl mx-auto custom-scrollbar"
          >
            <UnifiedChatConversations
              regularConversations={chatConversations}
              ragMessages={ragMessages}
              isQuerying={isQuerying}
              chatConversationsContainerRef={chatConversationsContainerRef}
              isRagMode={!!selectedDocumentSet}
            />
            <div ref={endRef} className="h-32" />
          </div>

          {/* Input */}
          <div className="w-full">
            <div className="max-w-4xl mx-auto">
              <ChatInput
                disabled={isQuerying}
                onSubmit={sendMessage}
                placeholder={
                  selectedDocumentSet ? `Ask a question about ${selectedDocumentSet}...` : "Type your message here..."
                }
                selectedModel={selectedModel}
                setSelectedModel={setSelectedModel}
                models={MODELS}
              />
            </div>
          </div>
        </main>
      </div>
    </div>
  )
}
