"use client"

import type React from "react"

import { SendHorizontal, Zap } from "lucide-react"
import { useCallback, useRef, useState } from "react"
import { cn } from "@/lib/utils"

export function ChatInput({
  disabled,
  onSubmit,
  placeholder,
  selectedModel,
  setSelectedModel,
  models,
}: {
  disabled?: boolean
  onSubmit: (value: string) => void
  placeholder?: string
  selectedModel: string
  setSelectedModel: (model: string) => void
  models: { label: string; value: string }[]
}) {
  const [value, setValue] = useState("")
  const textAreaRef = useRef<HTMLTextAreaElement>(null)

  const handleInput = useCallback(() => {
    const ta = textAreaRef.current
    if (ta) {
      ta.style.height = "auto"
      ta.style.height = ta.scrollHeight + "px"
    }
  }, [])

  const handleSubmit = useCallback(
    (e: React.SyntheticEvent) => {
      e.preventDefault()
      if (value.trim().length === 0) return
      onSubmit(value)
      setValue("")
      handleInput()
    },
    [onSubmit, value, handleInput],
  )

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
      if (e.key === "Enter" && !e.shiftKey) {
        e.preventDefault()
        handleSubmit(e)
      }
    },
    [handleSubmit],
  )

  return (
    <form className="w-full flex justify-center sticky bottom-0 z-10 px-4 pb-8" onSubmit={handleSubmit}>
      <div className="w-full max-w-4xl flex flex-row items-end gap-3 bg-slate-900/80 backdrop-blur-sm border border-white/10 rounded-2xl shadow-2xl px-4 py-3 transition-all focus-within:border-primary/50 focus-within:shadow-primary/25">
        {/* Model Selector */}
        <div className="flex items-center space-x-2 px-3 py-2 bg-slate-800/50 rounded-full border border-white/10">
          <Zap className="h-4 w-4 text-teal-400" />
          <select
            className="bg-transparent text-white border-none outline-none text-sm font-medium cursor-pointer"
            value={selectedModel}
            onChange={(e) => setSelectedModel(e.target.value)}
            disabled={disabled}
          >
            {models.map((model) => (
              <option key={model.value} value={model.value} className="bg-slate-800 text-white">
                {model.label}
              </option>
            ))}
          </select>
        </div>

        {/* Textarea */}
        <textarea
          ref={textAreaRef}
          value={value}
          onChange={(e) => {
            setValue(e.target.value)
            handleInput()
          }}
          onInput={handleInput}
          onKeyDown={handleKeyDown}
          placeholder={placeholder ?? "Type your message here..."}
          className="flex-1 resize-none bg-transparent border-none outline-none focus:ring-0 p-0 m-0 text-base text-white placeholder-slate-400 min-h-[40px] max-h-[200px] overflow-auto"
          rows={1}
          disabled={disabled}
        />

        {/* Send Button */}
        <button
          type="submit"
          disabled={disabled || value.trim().length === 0}
          className={cn(
            "rounded-full p-3 bg-gradient-to-r from-blue-500 to-teal-500 text-white transition-all hover:from-blue-600 hover:to-teal-600 shadow-lg shadow-blue-500/25 flex items-center justify-center",
            (disabled || value.trim().length === 0) && "from-slate-600 to-slate-700 shadow-none cursor-not-allowed",
          )}
          tabIndex={0}
          aria-label="Send message"
        >
          <SendHorizontal className="h-5 w-5" />
        </button>
      </div>
    </form>
  )
}
