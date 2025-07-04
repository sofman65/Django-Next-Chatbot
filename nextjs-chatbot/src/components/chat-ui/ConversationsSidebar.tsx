"use client"

import { MessageSquare, Plus, X } from "lucide-react"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"
import { useState, useEffect } from "react"
import { useIsMobile } from "@/hooks/use-mobile"

interface Conversation {
  id: string
  title: string
  createdAt: string
}

interface ConversationsSidebarProps {
  conversations: Conversation[]
  currentId?: string
  onNewChat: () => void
  onSelectConversation: (id: string) => void
  className?: string
  isSidebarOpen?: boolean
  closeSidebar?: () => void
}

export function ConversationsSidebar({
  conversations,
  currentId,
  onNewChat,
  onSelectConversation,
  className,
  isSidebarOpen = false,
  closeSidebar,
}: ConversationsSidebarProps) {
  const [storedConversations, setStoredConversations] = useState<Conversation[]>(conversations)
  const isMobile = useIsMobile()

  useEffect(() => {
    setStoredConversations(conversations)
  }, [conversations])

  return (
    <>
      <div
        className={cn(
          "fixed inset-y-0 left-0 z-40 flex w-80 flex-col border-r border-white/10 bg-background/95 backdrop-blur-sm text-white transition-transform duration-300 ease-in-out shadow-2xl",
          isSidebarOpen ? "translate-x-0" : "-translate-x-full",
          className,
        )}
      >
        {/* Top Bar */}
        <div className="flex h-16 items-center gap-3 border-b border-white/10 px-4 justify-between bg-background/80">
          <Button
            onClick={() => {
              onNewChat()
              if (isMobile && closeSidebar) closeSidebar()
            }}
            className="flex items-center gap-2 bg-gradient-to-r from-blue-500 to-teal-500 hover:from-blue-600 hover:to-teal-600 text-white shadow-lg shadow-blue-500/25 rounded-full px-4 py-2"
          >
            <Plus className="h-4 w-4" />
            <span className="text-sm font-medium">New Chat</span>
          </Button>

          {closeSidebar && (
            <Button
              onClick={closeSidebar}
              variant="ghost"
              className="text-slate-400 hover:text-white hover:bg-slate-800/80 rounded-full p-2"
              aria-label="Close sidebar"
            >
              <X className="h-5 w-5" />
            </Button>
          )}
        </div>

        {/* Conversations List */}
        <div className="flex-1 overflow-y-auto p-2">
          <div className="space-y-2">
            {storedConversations.map((conversation) => (
              <button
                key={conversation.id}
                onClick={() => {
                  onSelectConversation(conversation.id)
                  if (isMobile && closeSidebar) closeSidebar()
                }}
                className={cn(
                  "w-full text-left p-3 rounded-xl transition-all duration-200 group",
                  currentId === conversation.id
                    ? "bg-gradient-to-r from-blue-500/20 to-teal-500/20 border border-blue-500/30 shadow-lg shadow-blue-500/10"
                    : "hover:bg-slate-800/50 border border-transparent",
                )}
              >
                <div className="flex items-center gap-3">
                  <MessageSquare
                    className={cn(
                      "h-5 w-5 transition-colors",
                      currentId === conversation.id ? "text-blue-500" : "text-slate-400 group-hover:text-white",
                    )}
                  />
                  <div className="flex-1 min-w-0">
                    <p
                      className={cn(
                        "text-sm font-medium truncate transition-colors",
                        currentId === conversation.id ? "text-white" : "text-[#64748B] group-hover:text-white",
                      )}
                    >
                      {conversation.title}
                    </p>
                    <p className="text-xs text-[#64748B] mt-1">
                      {new Date(conversation.createdAt).toLocaleDateString()}
                    </p>
                  </div>
                </div>
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Mobile overlay */}
      {isSidebarOpen && isMobile && (
        <div
          className="fixed inset-0 z-30 bg-black/60 backdrop-blur-sm lg:hidden"
          onClick={closeSidebar}
          aria-label="Close sidebar"
        />
      )}
    </>
  )
}

export default ConversationsSidebar
