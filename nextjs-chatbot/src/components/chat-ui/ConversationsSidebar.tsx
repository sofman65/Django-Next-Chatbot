'use client'

import { MessageSquare, Plus, User } from 'lucide-react'
import {
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@/components/ui/sidebar"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"
import { useState } from 'react'

import { MessageRole } from '@/types/MessageRoles'
import { useEffect } from 'react'
const BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_URL;



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
  isSidebarOpen?: boolean // Controls visibility on mobile
  closeSidebar?: () => void // Callback to close sidebar
  fetchConversations: () => Promise<void>
}

export function ConversationsSidebar({
  conversations,
  currentId,
  onNewChat,
  onSelectConversation,
  className,
  isSidebarOpen = false, // Default to closed
  closeSidebar, // Callback to close
}: ConversationsSidebarProps) {

    const [storedConversations, setStoredConversations] = useState<Conversation[]>([]);

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

    


  return (
    <>
      {/* Sidebar */}
      <div
        className={cn(
          "fixed inset-y-0 left-0 z-30 flex w-72 flex-col border-r border-[#3333CC]/20 bg-[#3333CC] text-white transition-transform duration-300 ease-in-out",
          isSidebarOpen ? "translate-x-0" : "-translate-x-full", // Slide in/out on mobile
          "lg:relative lg:translate-x-0", // Always visible on large screens
          className
        )}
      >
        {/* Header with New Chat Button */}
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

        {/* Conversation List */}
        <div className=" p-2">
          <SidebarMenu>
            {storedConversations.map((conversation) => (
              <SidebarMenuItem key={conversation.id}>
                <SidebarMenuButton
                  asChild
                  isActive={currentId === conversation.id}
                  className={cn(
                    "w-full justify-start gap-2",
                    currentId === conversation.id
                      ? "bg-white/20 text-white"
                      : "text-white/80 hover:bg-white/10 hover:text-white"
                  )}
                  onClick={() => {
                    onSelectConversation(conversation.id)
                    if (closeSidebar) closeSidebar() // Close sidebar on mobile after selection
                  }}
                >
                  <div className="flex items-center gap-2">
                    <MessageSquare className="h-5 w-5" />
                    <span className="truncate">{conversation.title}</span>
                  </div>
                </SidebarMenuButton>
              </SidebarMenuItem>
            ))}
          </SidebarMenu>
        </div>

        {/* Footer with User Settings */}
        <div className="border-t absolute bottom-[70px]  border-white/10 p-2">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="ghost"
                className="w-full justify-start gap-2 text-white hover:bg-white/10"
              >
                <User className="h-5 w-5" />
                User Settings
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent side="top" className="w-[--radix-popper-anchor-width]">
              <DropdownMenuItem className="cursor-pointer hover:bg-white/10">
                Settings
              </DropdownMenuItem>
              <DropdownMenuItem className="cursor-pointer hover:bg-white/10">
                Sign Out
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      {/* Overlay for Mobile */}
      {isSidebarOpen && (
        <div
          className="fixed inset-0 z-20 bg-black/50 lg:hidden" // Visible only on mobile
          onClick={closeSidebar} // Close sidebar when clicking the backdrop
        />
      )}
    </>
  )
}
