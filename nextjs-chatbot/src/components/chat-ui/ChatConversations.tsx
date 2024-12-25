import { useEffect } from "react"
import { ChatMessage } from "./ChatMessage"
import type { Conversations } from "../../types"

interface ChatConversationsProps {
  conversations: Conversations
  isQuerying: boolean
  chatConversationsContainerRef: React.RefObject<HTMLDivElement>
}

export function ChatConversations({
  conversations,
  isQuerying,
  chatConversationsContainerRef,
}: ChatConversationsProps) {
  useEffect(() => {
    if (chatConversationsContainerRef.current) {
      chatConversationsContainerRef.current.scrollTop =
        chatConversationsContainerRef.current.scrollHeight
    }
  }, [conversations, chatConversationsContainerRef])

  return (
    <div className="flex w-full max-w-3xl flex-col space-y-4">
      {conversations.map((conversation, index) => (
        <ChatMessage
          key={conversation.id}
          role={conversation.role}
          message={conversation.message}
          isStreaming={
            isQuerying && 
            index === conversations.length - 1 && 
            conversation.role === "assistant"
          }
        />
      ))}
    </div>
  )
}



