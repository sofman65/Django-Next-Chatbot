"use client";

import React, { createContext, useContext, useState, useEffect } from 'react';
import { MemorySummary } from "@/lib/conversation-memory";
import { Conversations } from "@/types";
import { ConversationMemory } from "@/lib/conversation-memory";

interface ConversationMemoryContextType {
  memory: MemorySummary | undefined;
  updateFromConversations: (conversations: Conversations) => void;
  clearMemory: () => void;
}

const ConversationMemoryContext = createContext<ConversationMemoryContextType | undefined>(undefined);

export function ConversationMemoryProvider({ children }: { children: React.ReactNode }) {
  const [memory, setMemory] = useState<MemorySummary | undefined>();

  const updateFromConversations = (conversations: Conversations) => {
    try {
      if (Array.isArray(conversations) && conversations.length > 1) {
        const newMemory = ConversationMemory.summarizeConversation(conversations);
        setMemory(newMemory);
        console.log("Memory updated:", newMemory);
      }
    } catch (error) {
      console.error("Error updating conversation memory:", error);
    }
  };

  const clearMemory = () => {
    setMemory(undefined);
  };

  return (
    <ConversationMemoryContext.Provider
      value={{
        memory,
        updateFromConversations,
        clearMemory,
      }}
    >
      {children}
    </ConversationMemoryContext.Provider>
  );
}

export function useConversationMemory() {
  const context = useContext(ConversationMemoryContext);
  if (context === undefined) {
    throw new Error('useConversationMemory must be used within a ConversationMemoryProvider');
  }
  return context;
}
