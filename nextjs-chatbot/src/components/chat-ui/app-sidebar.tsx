"use client";

import { MessageSquare, Plus, User } from "lucide-react";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@/components/ui/sidebar";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { useAuth } from "@/contexts/auth-context";
import { SidebarActions } from "./sidebar-actions";

interface Conversation {
  id: string;
  title: string;
  createdAt: string;
}

interface AppSidebarProps {
  conversations: Conversation[];
  currentId?: string;
  onNewChat: () => void;
  onSelectConversation: (id: string) => void;
  className?: string;
}

export function AppSidebar({
  conversations,
  currentId,
  onNewChat,
  onSelectConversation,
  className,
}: AppSidebarProps) {
  const { user } = useAuth();

  return (
    <Sidebar
      className={cn("border-r border-[#3333CC]/20 bg-[#3333CC]", className)}
    >
      <SidebarHeader className="border-b border-white/10 p-2">
        <Button
          onClick={onNewChat}
          variant="ghost"
          className="w-full justify-start gap-2 text-white hover:bg-white/10"
        >
          <Plus className="h-5 w-5" />
          New Chat
        </Button>
      </SidebarHeader>
      <SidebarContent className="p-2">
        <SidebarMenu>
          {conversations.map((conversation) => (
            <SidebarMenuItem key={conversation.id}>
              <SidebarMenuButton
                asChild
                isActive={currentId === conversation.id}
                className={cn(
                  "w-full justify-start gap-2 text-white",
                  currentId === conversation.id
                    ? "bg-white/20"
                    : "text-white/80 hover:bg-white/10 hover:text-white",
                )}
                onClick={() => onSelectConversation(conversation.id)}
              >
                <div className="flex items-center gap-2">
                  <MessageSquare className="h-5 w-5" />
                  <span className="truncate">{conversation.title}</span>
                </div>
              </SidebarMenuButton>
            </SidebarMenuItem>
          ))}
        </SidebarMenu>
      </SidebarContent>
      <SidebarFooter className="border-t border-white/10 p-2">
        <SidebarActions />
      </SidebarFooter>
    </Sidebar>
  );
}
