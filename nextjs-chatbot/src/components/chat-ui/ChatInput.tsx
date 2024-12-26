"use client"

import { SendHorizontal } from 'lucide-react'
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { useCallback, useRef } from "react"

interface ChatInputProps {
  disabled?: boolean
  onSubmit: (value: string) => void
  placeholder?: string
}

export function ChatInput({ disabled, onSubmit, placeholder }: ChatInputProps) {
  const textAreaRef = useRef<HTMLTextAreaElement>(null)

  const handleSubmit = useCallback(
    (e: React.SyntheticEvent) => {
      e.preventDefault()
      const textArea = textAreaRef?.current
      if (textArea && textArea.value.trim().length > 0) {
        onSubmit(textArea.value)
        textArea.value = ""
      }
    },
    [onSubmit]
  )

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
      if (e.key === "Enter" && !e.shiftKey) {
        e.preventDefault()
        handleSubmit(e)
      }
    },
    [handleSubmit]
  )

  return (
    <div className="flex flex-col sm:flex-row items-center gap-2 p-4 w-full max-w-3xl mx-auto ">
      <Textarea
        ref={textAreaRef}
        placeholder={placeholder ?? "Type your message..."}
        className="min-h-[60px] w-full resize-none rounded-lg border focus-visible:ring-1"
        onKeyDown={handleKeyDown}
        disabled={disabled}
        rows={1}
      />
      <Button
        type="submit"
        size="icon"
        disabled={disabled}
        onClick={handleSubmit}
        className="h-[60px] w-[60px] shrink-0 bg-[#3333cc] text-white hover:bg-[#3333cc]/90 rounded-full"
      >
        <SendHorizontal className="size-5" />
        <span className="sr-only">Send message</span>
      </Button>
    </div>
  )
}