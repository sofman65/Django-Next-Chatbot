"use client"

import { useState } from "react"
import { MemorySummary } from "@/lib/conversation-memory"
import { Brain, ChevronUp, ChevronDown } from "lucide-react"
import { cn } from "@/lib/utils"

interface ConversationMemoryDisplayProps {
  memory: MemorySummary
  className?: string
}

export function ConversationMemoryDisplay({
  memory,
  className,
}: ConversationMemoryDisplayProps) {
  const [isExpanded, setIsExpanded] = useState(false)

  if (!memory) return null
  
  // Safety check for memory properties
  const keyPoints = Array.isArray(memory.keyPoints) ? memory.keyPoints : [];
  const entities = Array.isArray(memory.entities) ? memory.entities : [];
  const recentMessages = typeof memory.recentMessages === 'string' ? memory.recentMessages : '';
  const conversationLength = typeof memory.conversationLength === 'number' ? memory.conversationLength : 0;

  return (
    <div
      className={cn(
        "bg-slate-800/80 border border-white/10 rounded-lg shadow-lg text-white/70 transition-all duration-200",
        isExpanded ? "max-h-80 overflow-y-auto" : "max-h-12 overflow-hidden",
        className
      )}
    >
      <div 
        className="flex items-center justify-between p-2 cursor-pointer hover:bg-slate-700/50"
        onClick={() => setIsExpanded(!isExpanded)}
      >
        <div className="flex items-center gap-2">
          <Brain className="h-4 w-4 text-teal-400" />
          <div className="font-medium text-sm text-teal-300">Conversation Memory</div>
        </div>
        {isExpanded ? (
          <ChevronUp className="h-4 w-4 text-white/70" />
        ) : (
          <ChevronDown className="h-4 w-4 text-white/70" />
        )}
      </div>

      {isExpanded && (
        <div className="p-2 text-xs space-y-3">
          <div>
            <div className="font-medium mb-1 text-white/90">Recent Context:</div>
            <div className="whitespace-pre-line bg-slate-900/50 p-2 rounded-md">
              {recentMessages || "No recent messages"}
            </div>
          </div>

          <div>
            <div className="font-medium mb-1 text-white/90">Key Points ({keyPoints.length}):</div>
            {keyPoints.length > 0 ? (
              <ul className="list-disc pl-5 space-y-1">
                {keyPoints.map((point, i) => (
                  <li key={i} className="text-white/80">{point}</li>
                ))}
              </ul>
            ) : (
              <div className="text-white/50 italic">No key points identified</div>
            )}
          </div>

          <div>
            <div className="font-medium mb-1 text-white/90">Entities ({entities.length}):</div>
            <div className="flex flex-wrap gap-1">
              {entities.map((entity, i) => (
                <span
                  key={i}
                  className="bg-teal-900/30 text-teal-300 px-2 py-0.5 rounded-full text-xs"
                >
                  {entity}
                </span>
              ))}
              {entities.length === 0 && (
                <span className="text-white/50 italic">No entities identified</span>
              )}
            </div>
          </div>

          <div className="text-right text-xs text-white/50">
            {conversationLength} messages in conversation
          </div>
        </div>
      )}
    </div>
  )
}
