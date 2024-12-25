'use client'
import { SidebarProvider } from "../contexts/sidebar-context"
import ChatLayout from "../components/chat-ui/ChatLayout"

export default function Page() {
  return (
    <SidebarProvider defaultOpen={true}>
      <ChatLayout />
    </SidebarProvider>
  )
}

