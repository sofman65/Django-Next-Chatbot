'use client'

import { useRouter } from 'next/navigation'
import { Plus, Menu } from 'lucide-react'
import Image from 'next/image'
import { Button } from "@/components/ui/button"
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip"
import { useSidebar } from "@/contexts/sidebar-context"
import { useIsMobile } from '@/hooks/use-mobile'
import { cn } from "@/lib/utils"

interface ChatHeaderProps {
  onNewChat: () => void
}

export function ChatHeader({ onNewChat }: ChatHeaderProps) {
  const router = useRouter()
  const { isSidebarOpen, toggleSidebar } = useSidebar()
  const isMobile = useIsMobile()

  return (
    
    <header className="sticky top-0 z-50 flex h-14 items-center gap-4 border-b bg-white px-4">
      {isMobile && (
        <Button
          variant="ghost"
          size="icon"
          className="text-[#3333CC] hover:bg-[#3333CC]/10"
          onClick={toggleSidebar}
        >
          <Menu className="h-5 w-5" />
          <span className="sr-only">Toggle Sidebar</span>
        </Button>
      )}
      
      {/* {(!isSidebarOpen || isMobile) && (
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              className="text-[#3333CC] hover:bg-[#3333CC]/10"
              onClick={onNewChat}
            >
              <Plus className="h-5 w-5" />
              <span className="sr-only">New Chat</span>
            </Button>
          </TooltipTrigger>
          <TooltipContent>New Chat</TooltipContent>
        </Tooltip>
      )} */}

      <div className={cn(
        "flex-1 flex items-center",
        isMobile ? "justify-center" : "justify-start"
      )}>
        <Image 
          src="/NexiLogo.png"
          alt="Nexi Group Logo"
          width={80}
          height={30}
          className="h-8 w-auto"
        />
      </div>
    </header>
  )
}

