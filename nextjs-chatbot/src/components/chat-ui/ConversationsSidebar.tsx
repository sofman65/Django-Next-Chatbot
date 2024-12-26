'use client'

import { MessageSquare, Plus } from 'lucide-react'
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { useSidebar } from "@/contexts/sidebar-context"
import { cn } from "@/lib/utils"
import { useIsMobile } from '@/hooks/use-mobile';

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
}

export function ConversationsSidebar({
  conversations,
  currentId,
  onNewChat,
  onSelectConversation,
  className
}: ConversationsSidebarProps) {
  const router = useRouter()
  const { isSidebarOpen } = useSidebar()
  const isMobile = useIsMobile();

  if (!isSidebarOpen && isMobile) {
    return null;
  }

  return (
    <div className={cn(
      "fixed inset-y-0 z-30 flex w-72 flex-col border-r border-[#3333CC]/20 bg-[#3333CC] text-white",
      "transition-transform duration-300 ease-in-out",
      !isMobile && "lg:relative lg:translate-x-0",
      "shadow-[5px_0_25px_0_rgba(0,0,0,0.3)]",
      className
    )}>
      <div className="flex h-14 items-center gap-2 border-b border-white/10 px-2">
        <Button
          onClick={onNewChat}
          variant="ghost"
          className="w-full justify-start gap-2 text-white hover:bg-white/10"
        >
          <Plus className="h-5 w-5" />
          New Chat
        </Button>
      </div>
      <div className="flex-1 overflow-auto p-2">
        {conversations.map((conversation) => (
          <Button
            key={conversation.id}
            variant="ghost"
            className={cn(
              "w-full justify-start gap-2 text-white/80 hover:bg-white/10 hover:text-white",
              currentId === conversation.id && "bg-white/20 text-white"
            )}
            onClick={() => onSelectConversation(conversation.id)}
          >
            <MessageSquare className="h-5 w-5" />
            <span className="truncate">{conversation.title}</span>
          </Button>
        ))}
      </div>
    </div>
  )
}

