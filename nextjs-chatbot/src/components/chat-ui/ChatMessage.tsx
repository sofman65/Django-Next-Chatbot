import { MessageRole } from "../../types/MessageRoles"
import { cn } from "../../lib/utils"
import { Bot, User } from 'lucide-react'
import { CustomSkeleton } from "@/components/ui/CustomSkeleton"
import { Markdown } from "@/components/ui/Markdown"
import { CopyButton } from "../ui/copy-button"

interface ChatMessageProps {
  role: MessageRole
  message: string
  isStreaming?: boolean
}

export function ChatMessage({ role, message, isStreaming }: ChatMessageProps) {
  return (
    <div
      className={cn(
        "flex w-full items-start gap-2 p-2 sm:gap-4 sm:p-4 rounded-lg backdrop-blur-sm",
        "bg-white/80"
      )}
    >
      <div className={cn(
        "flex size-6 sm:size-8 shrink-0 select-none items-center justify-center rounded-md border shadow",
        "bg-[#3333CC] text-white"
      )}>
        {role === MessageRole.ASSISTANT ? (
          <Bot className="size-3 sm:size-4 text-white" />
        ) : (
          <User className="size-3 sm:size-4 text-white" />
        )}
      </div>
      <div className="flex-1 space-y-1 sm:space-y-2">
        <div className="flex items-center justify-between">
          <p className="text-xs sm:text-sm font-medium text-[#3333CC]">
            {role === MessageRole.ASSISTANT ? "Nexi Assistant" : "You"}
          </p>
        </div>
        <div className="group prose prose-sm sm:prose-base prose-neutral dark:prose-invert prose-p:leading-relaxed prose-pre:p-0 text-black relative">
          {message === "" && isStreaming ? (
            <CustomSkeleton />
          ) : (
            <>
              <Markdown>{message}</Markdown>
              {role === MessageRole.ASSISTANT && message && !isStreaming && (
                <CopyButton 
                  value={message}
                  className="absolute top-0 right-0 opacity-0 group-hover:opacity-100 transition-opacity"
                />
              )}
            </>
          )}
        </div>
      </div>
    </div>
  )
}



