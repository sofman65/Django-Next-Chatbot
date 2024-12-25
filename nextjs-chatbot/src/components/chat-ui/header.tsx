import Image from 'next/image'
import Link from "next/link"
import { Menu } from 'lucide-react'
import { SidebarTrigger } from "@/components/ui/sidebar"
import { SidebarProvider } from "@/contexts/sidebar-context"
import { ConversationsSidebar } from "./ConversationsSidebar"

export function Header() {
  return (
    <SidebarProvider defaultOpen={true}>
      <header className="sticky top-0 z-50 w-full border-b  backdrop-blur ">
        <div className="container flex h-14 items-center px-4">
          <div className="flex items-center gap-4">
          {/* <SidebarTrigger className="lg:hidden text-white" />
          <ConversationsSidebar conversations={[]} onNewChat={() => {}} /> */}
          <div className="flex items-center gap-2">
            <Image 
              priority
              src="/NexiLogo.png"
              alt="Nexi Group Logo"
              width={80}
              height={30}
              className="h-6 w-auto sm:h-8"
            />
          </div>
        </div>
        <div className="flex flex-1 items-center justify-end space-x-4">
          <nav className="flex items-center space-x-2">
            <Link
              href="https://www.nexigroup.com"
              target="_blank"
              rel="noreferrer"
              className="text-sm text-white/70 hover:text-white hidden sm:block"
            >
              About Nexi Group
            </Link>
          </nav>
        </div>
      </div>
    </header>
    </SidebarProvider>
  )
}

