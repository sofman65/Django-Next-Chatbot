"use client"

import { Menu, X, MessageSquare } from "lucide-react"
import { UserMenu } from "./UserMenu"

interface ChatHeaderProps {
  onToggleSidebar: () => void
  isSidebarOpen: boolean
}

export function ChatHeader({ onToggleSidebar, isSidebarOpen }: ChatHeaderProps) {
  return (
    <header className="w-full border-b border-gray-800 bg-black/90 backdrop-blur-sm shadow-lg">
      <div className="flex items-center h-16 px-4">
        {/* Hamburger/Close icon */}
        <button
          className="flex items-center justify-center w-10 h-10 rounded-lg hover:bg-blue-600/20 transition-colors"
          onClick={onToggleSidebar}
          aria-label={isSidebarOpen ? "Close sidebar" : "Open sidebar"}
        >
          {isSidebarOpen ? <X className="h-6 w-6 text-blue-400" /> : <Menu className="h-6 w-6 text-blue-400" />}
        </button>

        {/* Center: Logo */}
        <div className="flex-1 flex justify-center">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-500 to-blue-700 flex items-center justify-center shadow-lg shadow-blue-500/25">
              <MessageSquare className="h-6 w-6 text-white" />
            </div>
            <span className="text-2xl font-bold text-white tracking-wider">DOCHAT</span>
          </div>
        </div>

        {/* Right: User menu */}
        <div className="w-32 flex justify-end">
          <UserMenu />
        </div>
      </div>
    </header>
  )
}
