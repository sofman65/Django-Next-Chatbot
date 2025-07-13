"use client"

import { useState, useRef, useCallback, useEffect } from "react"
import { SendHorizontal, Zap, LightbulbIcon } from "lucide-react"
import { cn } from "@/lib/utils"

// For suggestions
import { EditorState, Plugin } from "prosemirror-state"
import { EditorView } from "prosemirror-view"
import { Schema, DOMParser } from "prosemirror-model"
import { keymap } from "prosemirror-keymap"
import { baseKeymap } from "prosemirror-commands"
import { history } from "prosemirror-history"

import { useSuggestions } from "@/hooks/use-suggestions"
import { suggestionsPlugin } from "@/lib/suggestions"
import { ConversationMemory, MemorySummary } from "@/lib/conversation-memory"
import { createSuggestionWidget } from "@/lib/suggestions"
import { DecorationSet } from "prosemirror-view"
import { suggestionsPluginKey } from "@/lib/suggestions"
import { useAuth } from "@/contexts/auth-context"
import { useConversationMemory } from "@/contexts/conversation-memory-context"

export interface EnhancedChatInputProps {
    disabled?: boolean
    onSubmit: (value: string) => void
    placeholder?: string
    selectedModel: string
    setSelectedModel: (model: string) => void
    models: { label: string; value: string }[]
}

// Create a simple schema for the ProseMirror editor
const schema = new Schema({
    nodes: {
        doc: {
            content: "paragraph+",
        },
        paragraph: {
            content: "text*",
            toDOM() {
                return ["p", 0]
            },
        },
        text: {
            group: "inline",
        },
    },
    marks: {},
})

export function EnhancedChatInput({
    disabled,
    onSubmit,
    placeholder,
    selectedModel,
    setSelectedModel,
    models,
}: EnhancedChatInputProps) {
    const { authState } = useAuth()
    const { memory } = useConversationMemory()
    const [value, setValue] = useState("")
    const editorRef = useRef<HTMLDivElement>(null)
    const [editorState, setEditorState] = useState<EditorState | undefined>()
    const [editorView, setEditorView] = useState<EditorView | undefined>()
    const [suggestionsVisible, setSuggestionsVisible] = useState(false)

    // Setup suggestions first so we can use it in the editor initialization
    const { suggestions, loading: suggestionsLoading, fetchSuggestions: triggerFetchSuggestions } = useSuggestions({
        editorState,
        editorView,
        enabled: true,
        accessToken: authState.accessToken || undefined,
        memory,
        useMock: true // Always use mock suggestions for demo purposes
    })

    // Initialize ProseMirror editor
    useEffect(() => {
        if (!editorRef.current) return

        const state = EditorState.create({
            schema,
            plugins: [
                history(),
                keymap(baseKeymap),
                suggestionsPlugin,
                new Plugin({
                    props: {
                        handleKeyDown: (view, event) => {
                            if (event.key === "Enter" && !event.shiftKey) {
                                event.preventDefault()
                                const text = view.state.doc.textContent
                                if (text.trim().length === 0) return true
                                onSubmit(text)

                                // Clear the editor
                                const tr = view.state.tr
                                tr.delete(0, view.state.doc.content.size)
                                view.dispatch(tr)

                                return true
                            }
                            return false
                        },
                    },
                }),
            ],
        })

        const view = new EditorView(editorRef.current, {
            state,
            dispatchTransaction: (transaction) => {
                try {
                    const newState = view.state.apply(transaction)
                    view.updateState(newState)
                    setEditorState(newState)
                    setValue(newState.doc.textContent)
                } catch (error) {
                    console.error("Error dispatching transaction:", error);
                }
            },
            handleDOMEvents: {
                focus: () => {
                    // Show suggestions when user focuses on the editor
                    setTimeout(() => {
                        const text = view.state.doc.textContent;
                        if (triggerFetchSuggestions) {
                            triggerFetchSuggestions(text);
                        }
                    }, 100);
                    return false;
                }
            }
        })

        setEditorView(view)
        setEditorState(state)

        return () => {
            try {
                if (view) {
                    view.destroy();
                }
            } catch (error) {
                console.error("Error destroying editor view:", error);
            }
        }
    }, [onSubmit, triggerFetchSuggestions])

    // Trigger suggestions on component mount
    useEffect(() => {
        if (editorView) {
            // Force trigger suggestions when component mounts
            const text = editorView.state.doc.textContent;
            triggerFetchSuggestions?.(text);
        }
    }, [editorView, triggerFetchSuggestions]);

    // Update suggestion decorations in the editor
    useEffect(() => {
        if (!editorState || !suggestions) return

        // Set suggestion visibility flag
        setSuggestionsVisible(suggestions.length > 0)

        // Log available suggestions
        console.log("Suggestions available:", suggestions);

    }, [suggestions, editorState])

    // Handle form submission
    const handleSubmit = useCallback(
        (e: React.SyntheticEvent) => {
            e.preventDefault()
            if (!editorView) return

            const text = editorView.state.doc.textContent
            if (text.trim().length === 0) return

            onSubmit(text)

            // Clear the editor
            const tr = editorView.state.tr
            tr.delete(0, editorView.state.doc.content.size)
            editorView.dispatch(tr)
        },
        [editorView, onSubmit]
    )

    return (
        <form className="w-full flex justify-center sticky bottom-0 z-10 px-4 pb-8" onSubmit={handleSubmit}>
            <div className="w-full max-w-4xl flex flex-row items-end gap-3 bg-slate-900/80 backdrop-blur-sm border border-white/10 rounded-2xl shadow-2xl px-4 py-3 transition-all focus-within:border-primary/50 focus-within:shadow-primary/25 relative">
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

                {/* Editor Area */}
                <div className="flex-1 min-h-[40px] max-h-[200px] overflow-auto relative">
                    <div
                        ref={editorRef}
                        className="w-full h-full text-white outline-none focus:outline-none"
                        style={{ minHeight: '24px', WebkitUserSelect: 'text', WebkitTapHighlightColor: 'transparent' }}
                    />
                    {(!editorRef.current || !editorRef.current.textContent) && (
                        <div className="absolute top-0 left-0 pointer-events-none text-slate-400 text-base p-0 m-0">
                            {placeholder ?? "Write a message..."}
                        </div>
                    )}
                </div>      {/* Suggestions - Above the input as quick select buttons */}
                {suggestionsVisible && suggestions.length > 0 && (
                    <div className="absolute bottom-full left-0 right-0 flex flex-wrap justify-center gap-2 mb-2 px-2">
                        {suggestions.map((suggestion) => (
                            <button
                                key={suggestion.id}
                                className="bg-slate-800/90 border border-white/10 hover:bg-slate-700 text-white rounded-md px-4 py-2 text-sm shadow-lg transition-all whitespace-nowrap"
                                onClick={() => {
                                    if (editorView) {
                                        try {
                                            // Apply suggestion by submitting directly
                                            onSubmit(suggestion.suggestedText);

                                            // Clear editor
                                            const tr = editorView.state.tr;
                                            tr.delete(0, editorView.state.doc.content.size);
                                            editorView.dispatch(tr);
                                        } catch (error) {
                                            console.error("Error applying suggestion:", error);
                                        }
                                    }
                                }}
                            >
                                {suggestion.suggestedText}
                            </button>
                        ))}
                    </div>
                )}

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

            {/* Memory Summary Indicator (for debugging) */}
            {memory && (
                <div className="absolute bottom-20 right-4 text-xs bg-slate-800/80 border border-white/10 rounded-lg p-2 max-w-xs overflow-hidden shadow-lg text-white/70">
                    <div className="font-semibold mb-1 text-teal-400">Conversation Memory</div>
                    <div className="text-xs opacity-70 truncate">
                        {memory.keyPoints.length} key points | {memory.entities.length} entities
                    </div>
                </div>
            )}
        </form>
    )
}
