import { MessageRole } from "../../types/MessageRoles"
import { cn } from "../../lib/utils"
import { Bot, User } from "lucide-react"
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
        "flex w-full items-start gap-4 p-6 rounded-2xl backdrop-blur-sm transition-all hover:bg-gray-900/30",
        "bg-gray-900/20 border border-gray-800/50",
        "ml-4 sm:ml-6",
      )}
    >
      <div
        className={cn(
          "flex size-10 shrink-0 select-none items-center justify-center rounded-full shadow-lg",
          role === MessageRole.ASSISTANT
            ? "bg-gradient-to-br from-blue-500 to-blue-700 shadow-blue-500/25"
            : "bg-gradient-to-br from-gray-600 to-gray-800 shadow-gray-500/25",
        )}
      >
        {role === MessageRole.ASSISTANT ? (
          <Bot className="size-5 text-white" />
        ) : (
          <User className="size-5 text-white" />
        )}
      </div>

      <div className="flex-1 space-y-2">
        <div className="flex items-center justify-between">
          <p className="text-sm font-medium text-blue-400">
            {role === MessageRole.ASSISTANT ? "Dochat Assistant" : "You"}
          </p>
        </div>

        <div className="group prose prose-sm prose-invert prose-p:leading-relaxed prose-pre:p-0 text-gray-100 relative max-w-none">
          {(message === "" && isStreaming) || message === null ? (
            <CustomSkeleton />
          ) : (
            <>
              <Markdown>{message}</Markdown>
              {role === MessageRole.ASSISTANT && message && !isStreaming && (
                <CopyButton
                  value={message}
                  className="absolute top-0 right-0 opacity-0 group-hover:opacity-100 transition-opacity bg-gray-800 hover:bg-gray-700 text-gray-300"
                />
              )}
            </>
          )}
        </div>
      </div>
    </div>
  )
}
