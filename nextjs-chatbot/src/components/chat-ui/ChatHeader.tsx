"use client";

import { Menu, X } from "lucide-react";
import Image from "next/image";
import { useSidebar } from "@/components/ui/sidebar";
import { UserMenu } from "./UserMenu";

interface ChatHeaderProps {
  onToggleSidebar: () => void;
  isSidebarOpen: boolean;
}

export function ChatHeader({ onToggleSidebar, isSidebarOpen }: ChatHeaderProps) {
  // Show hamburger or close only on mobile
  return (
    <header className="w-full border-b bg-white">
      <div className="flex items-center h-16 px-4">
        {/* Left: Hamburger/Close icon for mobile */}
        <div className="w-10 flex justify-start">
          <button
            className="lg:hidden flex items-center justify-center rounded hover:bg-[#3333CC]/10"
            onClick={onToggleSidebar}
            aria-label={isSidebarOpen ? "Close sidebar" : "Open sidebar"}
          >
            {isSidebarOpen ? (
              <X className="h-6 w-6 text-[#3333CC]" />
            ) : (
              <Menu className="h-6 w-6 text-[#3333CC]" />
            )}
          </button>
        </div>

        {/* Center: Logo */}
        <div className="flex-1 flex justify-center pointer-events-none">
          <Image
            src="/NexiLogo.png"
            alt="Nexi Group Logo"
            width={110}
            height={32}
            className="h-8 w-auto"
            priority
          />
        </div>

        {/* Right: User */}
        <div className="w-32 flex justify-end">
          <UserMenu />
        </div>
      </div>
    </header>
  );
}
