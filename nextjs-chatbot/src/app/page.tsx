"use client";

import ChatLayout from "@/components/chat-ui/ChatLayout";
import { AuthProvider } from "@/contexts/auth-context";

export default function Page() {
  return(
    <AuthProvider>
      <ChatLayout />
    </AuthProvider>
  )
}
