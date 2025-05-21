"use client";

import { MessageSquare, Plus } from "lucide-react";
import {
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@/components/ui/sidebar";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { useState, useEffect, useCallback } from "react";

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

  useEffect(() => {
    setStoredConversations(conversations);
  }, [conversations]);

  return (
    <>
      <div
        className={cn(
          "fixed inset-y-0 left-0 z-40 flex w-72 flex-col border-r border-[#3333CC]/20 bg-[#3333CC] text-white transition-transform duration-300 ease-in-out",
          isSidebarOpen ? "translate-x-0" : "-translate-x-full",
          "lg:relative lg:translate-x-0",
          className
        )}
      >
        {/* New Chat at the top */}
        <div className="flex h-14 items-center gap-2 border-b border-white/10 px-2">
          <Button
            onClick={() => {
              onNewChat();
              if (closeSidebar) closeSidebar(); // also close sidebar on mobile after click
            }}
            variant="ghost"
            className="w-full justify-start gap-2 text-white hover:bg-white/10"
          >
            <Plus className="h-5 w-5" />
            New Chat
          </Button>
        </div>

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
                    if (closeSidebar) closeSidebar();
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
      {/* Overlay for mobile */}
      {isSidebarOpen && (
        <div
          className="fixed inset-0 z-30 bg-black/40 lg:hidden"
          onClick={closeSidebar}
        />
      )}
    </>
  );
}
