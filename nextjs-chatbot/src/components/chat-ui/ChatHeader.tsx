"use client";

import { Plus } from "lucide-react";
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
  const { state } = useSidebar();
  const isMobile = useIsMobile();

  return (
<header className="sticky top-0 z-50 flex h-14 items-center gap-4 border-b bg-white px-4 shadow">
  {isMobile && <SidebarToggle />}
  <div className={cn("flex-1 flex items-center", isMobile ? "justify-center" : "justify-start")}>
    <Image
      src="/NexiLogo.png"
      alt="Nexi Group Logo"
      width={80}
      height={30}
      className="h-8 w-auto"
    />
  </div>
</header>

  );
}
