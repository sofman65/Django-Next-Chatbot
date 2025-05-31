"use client";

import { MessageSquare, Plus, X } from "lucide-react";
import {
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@/components/ui/sidebar";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { useState, useEffect } from "react";
import { useIsMobile } from "@/hooks/use-mobile"; // <-- Import your hook here

const BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_URL;

interface Conversation {
  id: string;
  title: string;
  createdAt: string;
}

interface ConversationsSidebarProps {
  conversations: Conversation[];
  currentId?: string;
  onNewChat: () => void;
  onSelectConversation: (id: string) => void;
  className?: string;
  isSidebarOpen?: boolean;
  closeSidebar?: () => void;
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
  const [storedConversations, setStoredConversations] = useState<Conversation[]>(conversations);
  const isMobile = useIsMobile();

  useEffect(() => {
    setStoredConversations(conversations);
  }, [conversations]);

  return (
    <>
      <div
        className={cn(
          "fixed inset-y-0 left-0 z-40 flex w-72 flex-col border-r border-[#3333CC]/20 bg-[#3333CC] text-white transition-transform duration-300 ease-in-out",
          isSidebarOpen ? "translate-x-0" : "-translate-x-full",
          className
        )}
      >
        {/* Top Bar: Plus and X */}
        <div className="flex h-14 items-center gap-2 border-b border-white/10 px-2 justify-between">
          {/* New Chat (Plus) */}
          <Button
            onClick={() => {
              onNewChat();
              if (isMobile && closeSidebar) closeSidebar();
            }}
            variant="ghost"
            className="gap-2 text-white hover:bg-white/10"
          >
            <Plus className="h-5 w-5" />
          </Button>
          {/* X Button  */}
          {closeSidebar && (
            <Button
              onClick={closeSidebar}
              variant="ghost"
              className="text-white hover:bg-white/10 ml-auto"
              aria-label="Close sidebar"
            >
              <X className="h-5 w-5" />
            </Button>
          )}
        </div>

        {/* Conversations List */}
        <div className="flex-1 overflow-y-auto">
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
                    onSelectConversation(conversation.id);
                    if (isMobile && closeSidebar) closeSidebar();
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
      </div>

      {/* Mobile overlay */}
      {isSidebarOpen && isMobile && (
        <div
          className="fixed inset-0 z-30 bg-black/40 lg:hidden"
          onClick={closeSidebar}
          aria-label="Close sidebar"
        />
      )}
    </>
  );
}

export default ConversationsSidebar;
