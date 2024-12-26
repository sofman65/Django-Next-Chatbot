'use client'

import { Menu } from 'lucide-react'
import { Button } from "@/components/ui/button"
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip"
import { SidebarProvider, useSidebar } from "@/components/ui/sidebar"

export function SidebarToggle() {
  const { toggleSidebar } = useSidebar()

  return (
    <SidebarProvider>
    <Tooltip>
      <TooltipTrigger asChild>
        <Button
          onClick={toggleSidebar}
          variant="ghost"
          size="icon"
          className="text-white hover:bg-white/10"
        >
          <Menu className="h-5 w-5" />
          <span className="sr-only">Toggle Sidebar</span>
        </Button>
      </TooltipTrigger>
      <TooltipContent>Toggle Sidebar</TooltipContent>
    </Tooltip>
    </SidebarProvider>
  )
}

