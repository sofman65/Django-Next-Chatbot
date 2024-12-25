'use client'

import { MessageSquare, Plus } from 'lucide-react'
import { useRouter } from "next/navigation"
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarRail,
} from "@/components/ui/sidebar"

interface Conversation {
  id: string
  title: string
  createdAt: string
}

interface ConversationsSidebarProps {
  conversations: Conversation[]
  currentId?: string
  onNewChat: () => void
}

export function ConversationsSidebar({
  conversations,
  currentId,
  onNewChat,
}: ConversationsSidebarProps) {
  const router = useRouter()

  return (
    <Sidebar className="border-r border-[#3333CC]/20 bg-white/80 backdrop-blur-sm">
      <SidebarHeader>
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton 
              onClick={onNewChat} 
              className="w-full bg-[#3333CC] text-white hover:bg-[#3333CC]/90"
            >
              <Plus className="mr-2 size-4" />
              <span className="hidden sm:inline">New Chat</span>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarHeader>
      <SidebarContent>
        <SidebarMenu>
          {conversations.map((conversation) => (
            <SidebarMenuItem key={conversation.id}>
              <SidebarMenuButton
                asChild
                isActive={currentId === conversation.id}
                className={currentId === conversation.id ? "bg-[#3333CC]/10" : ""}
              >
                <button
                  onClick={() => router.push(`/chat/${conversation.id}`)}
                  className="w-full"
                >
                  <MessageSquare className="mr-2 size-4" />
                  <span className="truncate">{conversation.title}</span>
                </button>
              </SidebarMenuButton>
            </SidebarMenuItem>
          ))}
        </SidebarMenu>
      </SidebarContent>
      <SidebarFooter>
        <div className="p-4 text-xs text-[#3333CC]/70">
          Powered by Nexi Group
        </div>
      </SidebarFooter>
      <SidebarRail />
    </Sidebar>
  )
}

