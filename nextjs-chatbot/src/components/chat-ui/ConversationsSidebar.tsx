"use client";

import { MessageSquare, Plus, User } from "lucide-react";
import {
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@/components/ui/sidebar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { useState, useEffect, useCallback } from "react";
import { useAuth } from "@/contexts/auth-context";
import { useRouter } from "next/navigation";

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
  fetchConversations?: () => Promise<void>;
  isSidebarOpen?: boolean;
  closeSidebar?: () => void;
}

export function ConversationsSidebar({
  conversations,
  currentId,
  onNewChat,
  onSelectConversation,
  className,
  fetchConversations: propFetchConversations,
  isSidebarOpen = false,
  closeSidebar,
}: ConversationsSidebarProps) {
  const [storedConversations, setStoredConversations] = useState<Conversation[]>(conversations);
  const { authState, logout } = useAuth();
  const router = useRouter();

  const handleSignOut = async () => {
    try {
      await logout();
      if (closeSidebar) closeSidebar();
    } catch (error) {
      console.error('Logout failed:', error);
    }
  };

  const fetchConversations = useCallback(async () => {
    if (propFetchConversations) {
      await propFetchConversations();
    } else {
      try {
        const token = localStorage.getItem('accessToken');
        const response = await fetch(`${BACKEND_URL}/api/conversations`, {
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${authState.accessToken}`,
          },
        });

        if (!response.ok) {
          throw new Error("Failed to fetch conversations");
        }

        const data = await response.json();
        if (data.conversations) {
          const sortedConversations = data.conversations.sort(
            (a: Conversation, b: Conversation) => 
              new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
          );
          setStoredConversations(sortedConversations);
        }
      } catch (error) {
        console.error("Error fetching conversations:", error);
      }
    }
  }, [authState.accessToken, propFetchConversations]);

  useEffect(() => {
    setStoredConversations(conversations);
  }, [conversations]);

  useEffect(() => {
    if (isSidebarOpen) {
      fetchConversations();
    }
  }, [isSidebarOpen, fetchConversations]);

  return (
    <>
      <div
        className={cn(
          "fixed inset-y-0 left-0 z-30 flex w-72 flex-col border-r border-[#3333CC]/20 bg-[#3333CC] text-white transition-transform duration-300 ease-in-out",
          isSidebarOpen ? "translate-x-0" : "-translate-x-full",
          "lg:relative lg:translate-x-0",
          className
        )}
      >
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

        <div className="flex-1 p-2">
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
        <div className="border-t absolute bottom-[70px] border-white/10 p-2">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="ghost"
                className="w-full justify-start gap-2 text-white hover:bg-white/10"
              >
                <User className="h-5 w-5" />
                {authState.user ? authState.user.username : 'User Settings'}
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent side="top" className="w-[--radix-popper-anchor-width]">
              {authState.accessToken ? (
                <>
                  <DropdownMenuItem 
                    className="cursor-pointer hover:bg-white/10"
                    onClick={() => router.push('/profile')}
                  >
                    Profile
                  </DropdownMenuItem>
                  <DropdownMenuItem 
                    className="cursor-pointer hover:bg-white/10"
                    onClick={() => router.push('/settings')}
                  >
                    Account Settings
                  </DropdownMenuItem>
                  <DropdownMenuItem 
                    className="cursor-pointer hover:bg-white/10"
                    onClick={() => router.push('/help')}
                  >
                    Help & Support
                  </DropdownMenuItem>
                  <DropdownMenuItem 
                    className="cursor-pointer text-red-500 hover:bg-red-500/10"
                    onClick={handleSignOut}
                  >
                    Log Out
                  </DropdownMenuItem>
                </>
              ) : (
                <>
                  <DropdownMenuItem 
                    className="cursor-pointer hover:bg-white/10"
                    onClick={() => router.push('/login')}
                  >
                    Log In
                  </DropdownMenuItem>
                  <DropdownMenuItem 
                    className="cursor-pointer hover:bg-white/10"
                    onClick={() => router.push('/signup')}
                  >
                    Create Account
                  </DropdownMenuItem>
                </>
              )}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      {isSidebarOpen && (
        <div
          className="fixed inset-0 z-20 bg-black/50 lg:hidden"
          onClick={closeSidebar}
        />
      )}
    </>
  );
}
