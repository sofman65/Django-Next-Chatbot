"use client"

import { Menu, X } from "lucide-react"
import { UserMenu } from "./UserMenu"
import { Space_Grotesk } from "next/font/google";

const spaceGrotesk = Space_Grotesk({
  subsets: ["latin"],
  weight: ['400', '700'],
  variable: '--font-space-grotesk',
});

interface ChatHeaderProps {
  onToggleSidebar: () => void
  isSidebarOpen: boolean
}

export function ChatHeader({ onToggleSidebar, isSidebarOpen }: ChatHeaderProps) {
  return (
    <header className="w-full border-b border-border bg-background/80 backdrop-blur-sm shadow-md">
      <div className="flex items-center h-16 px-4">
        {/* Left: Hamburger/Close icon */}
        <div className="flex items-center w-20">
          <button
            className="flex items-center justify-center w-10 h-10 rounded-lg hover:bg-primary/20 transition-colors"
            onClick={onToggleSidebar}
            aria-label={isSidebarOpen ? "Close sidebar" : "Open sidebar"}
          >
            {isSidebarOpen ? <X className="h-6 w-6 text-primary" /> : <Menu className="h-6 w-6 text-primary" />}
          </button>
        </div>

        {/* Center: Logo */}
        <div className="flex-1 flex justify-center">
          <div className={`${spaceGrotesk.className} text-2xl font-bold bg-gradient-to-r from-blue-400 via-teal-400 to-emerald-400 bg-clip-text text-transparent`}>
            DoChat.ai
          </div>
        </div>

        {/* Right: User menu */}
        <div className="flex justify-end w-20">
          <UserMenu />
        </div>
      </div>
    </header>
  )
}
