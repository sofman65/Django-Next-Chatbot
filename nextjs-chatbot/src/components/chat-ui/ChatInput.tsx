"use client";

import { SendHorizontal } from "lucide-react";
import { useCallback, useRef, useState } from "react";
import { cn } from "@/lib/utils"; // If you have a classNames util

export function ChatInput({
  disabled,
  onSubmit,
  placeholder,
  selectedModel,
  setSelectedModel,
  models,
}: {
  disabled?: boolean;
  onSubmit: (value: string) => void;
  placeholder?: string;
  selectedModel: string;
  setSelectedModel: (model: string) => void;
  models: { label: string; value: string }[];
}) {
  const [value, setValue] = useState("");
  const textAreaRef = useRef<HTMLTextAreaElement>(null);

  // Auto-expand textarea
  const handleInput = useCallback(() => {
    const ta = textAreaRef.current;
    if (ta) {
      ta.style.height = "auto";
      ta.style.height = ta.scrollHeight + "px";
    }
  }, []);

  const handleSubmit = useCallback(
    (e: React.SyntheticEvent) => {
      e.preventDefault();
      if (value.trim().length === 0) return;
      onSubmit(value);
      setValue("");
      handleInput();
    },
    [onSubmit, value, handleInput]
  );

  // Enter to send, Shift+Enter for newline
  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
      if (e.key === "Enter" && !e.shiftKey) {
        e.preventDefault();
        handleSubmit(e);
      }
    },
    [handleSubmit]
  );

  return (
    <form
      className={cn(
        "w-full flex justify-center sticky bottom-0 z-10 px-2 pb-10"
      )}
      style={{ backdropFilter: "blur(8px)" }}
      onSubmit={handleSubmit}
    >
      <div className="w-full max-w-2xl flex flex-row items-end gap-2 bg-white border border-gray-200 rounded-2xl shadow-lg px-3 py-2 transition-all focus-within:border-blue-400">
        {/* Model Selector */}
        <select
          className="rounded-full px-3 py-2 mr-2 bg-gray-100 text-gray-800 border-none outline-none shadow-sm text-sm font-medium transition focus:ring-2 focus:ring-blue-300"
          value={selectedModel}
          onChange={(e) => setSelectedModel(e.target.value)}
          disabled={disabled}
        >
          {models.map((model) => (
            <option key={model.value} value={model.value}>
              {model.label}
            </option>
          ))}
        </select>
        {/* Textarea */}
        <textarea
          ref={textAreaRef}
          value={value}
          onChange={e => {
            setValue(e.target.value);
            handleInput();
          }}
          onInput={handleInput}
          onKeyDown={handleKeyDown}
          placeholder={placeholder ?? "Type your message here..."}
          className="flex-1 resize-none bg-transparent border-none outline-none focus:ring-0 p-0 m-0 text-base min-h-[40px] max-h-[200px] overflow-auto transition placeholder-gray-400"
          rows={1}
          disabled={disabled}
        />
        {/* Send Button */}
        <button
          type="submit"
          disabled={disabled || value.trim().length === 0}
          className={cn(
            "rounded-full p-2 bg-blue-600 text-white transition hover:bg-blue-700 shadow-md flex items-center justify-center",
            (disabled || value.trim().length === 0) && "bg-gray-300 text-gray-500 cursor-not-allowed"
          )}
          tabIndex={0}
          aria-label="Send message"
        >
          <SendHorizontal className="h-5 w-5" />
        </button>
      </div>
    </form>
  );
}
