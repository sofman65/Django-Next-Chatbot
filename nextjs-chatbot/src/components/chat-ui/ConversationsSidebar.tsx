"use client"

import { MessageSquare, Plus, X, Database } from "lucide-react"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"
import { useState, useEffect } from "react"
import { useIsMobile } from "@/hooks/use-mobile"
import { Separator } from "@/components/ui/separator"
import { DocumentSelectorModal } from "./DocumentSelectorModal"

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
  // Add new props for document selection
  fetchWithAuth?: (input: RequestInfo, init?: RequestInit) => Promise<Response>
  selectedDocumentSet?: string | null
  onSelectDocumentSet?: (setName: string | null) => void
}

export function ConversationsSidebar({
  conversations,
  currentId,
  onNewChat,
  onSelectConversation,
  className,
  isSidebarOpen = false,
  closeSidebar,
  // Include new props in destructuring
  fetchWithAuth,
  selectedDocumentSet,
  onSelectDocumentSet,
}: ConversationsSidebarProps) {
  const [storedConversations, setStoredConversations] = useState<Conversation[]>(conversations)
  const [isModalOpen, setIsModalOpen] = useState(false)
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

        {/* Document Selector Section - Added at top of sidebar */}
        {fetchWithAuth && onSelectDocumentSet && (
          <div className="p-4 border-b border-white/10">
            <div className="flex flex-col space-y-2">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <Database className="h-4 w-4 text-blue-400" />
                  <h3 className="text-sm font-medium text-white">Document Set</h3>
                </div>
                {selectedDocumentSet && (
                  <Button
                    onClick={() => onSelectDocumentSet(null)}
                    variant="ghost"
                    size="sm"
                    className="h-6 w-6 p-0 rounded-full hover:bg-red-500/20"
                    title="Clear document set"
                  >
                    <X className="h-3 w-3" />
                  </Button>
                )}
              </div>

              {selectedDocumentSet ? (
                <div className="flex flex-col space-y-3">
                  <div className="flex items-center space-x-2 px-3 py-2.5 bg-blue-500/20 border border-blue-500/30 rounded-lg">
                    <Database className="h-4 w-4 text-blue-300 flex-shrink-0" />
                    <span className="text-sm text-blue-300 font-medium truncate">{selectedDocumentSet}</span>
                  </div>
                  <Button
                    onClick={() => setIsModalOpen(true)}
                    variant="outline"
                    size="sm"
                    className="w-full justify-center text-xs bg-blue-500/10 border-blue-500/30 hover:bg-blue-500/20 text-blue-400 hover:text-blue-300"
                  >
                    <Database className="h-3 w-3 mr-1.5" />
                    Change Document Set
                  </Button>
                </div>
              ) : (
                <Button
                  onClick={() => setIsModalOpen(true)}
                  variant="outline"
                  className="w-full justify-start text-sm bg-gray-800/40 border-gray-700 hover:bg-gray-700/60"
                >
                  <Database className="h-4 w-4 mr-2" />
                  Select Document Set
                </Button>
              )}

              {/* Document Selector Modal - only render once */}
              <DocumentSelectorModal
                fetchWithAuth={fetchWithAuth}
                selectedDocumentSet={selectedDocumentSet || null}
                onSelectDocumentSet={onSelectDocumentSet}
                isOpen={isModalOpen}
                onOpenChange={setIsModalOpen}
              />
            </div>
          </div>
        )}

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
