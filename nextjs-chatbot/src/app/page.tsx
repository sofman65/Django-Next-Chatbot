'use client'
import { SidebarProvider } from "../contexts/sidebar-context"
import ChatLayout from "../components/chat-ui/ChatLayout"
import { useIsMobile } from '@/hooks/use-mobile'
import { TooltipProvider } from "@/components/ui/tooltip"

export default function Page() {
  const isMobile = useIsMobile();
  
  return (
    <TooltipProvider>
      <SidebarProvider defaultOpen={!isMobile}>
        <ChatLayout />
      </SidebarProvider>
    </TooltipProvider>
  )
}

