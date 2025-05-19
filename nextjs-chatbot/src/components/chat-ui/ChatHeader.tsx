"use client";

import { Plus, Menu } from "lucide-react";
import Image from "next/image";
import { Button } from "@/components/ui/button";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { useSidebar } from "@/components/ui/sidebar";
import { useIsMobile } from "@/hooks/use-mobile";
import { cn } from "@/lib/utils";
import { SidebarToggle } from "./sidebar-toggle";

interface ChatHeaderProps {
  onNewChat: () => void;
}

export function ChatHeader({ onNewChat }: ChatHeaderProps) {
  const { toggleSidebar } = useSidebar();
  const isMobile = useIsMobile();

  return (
    <header className="sticky top-0 z-50 flex items-center border-b bg-white px-4 shadow">
      {isMobile ? (
        <Button
          onClick={toggleSidebar}
          variant="ghost"
          size="icon"
          className="text-[#3333CC] hover:bg-[#3333CC]/10"
        >
          <Menu className="h-5 w-5" />
          <span className="sr-only">Toggle Sidebar</span>
        </Button>
      ) : (
        <div className="flex-1 flex items-center justify-start">
          <Image
            src="/NexiLogo.png"
            alt="Nexi Group Logo"
            width={80}
            height={30}
            className="h-8 w-auto"
          />
        </div>
      )}
    </header>
  );
}
