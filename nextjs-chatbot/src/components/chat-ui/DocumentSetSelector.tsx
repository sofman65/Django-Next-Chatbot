"use client"

import { useState, useEffect, useCallback } from "react"
import { FileText, Database, ChevronDown, X, Sparkles } from "lucide-react"

interface DocumentSet {
    name: string
    document_count: number
    created_at: string
    status: "processing" | "completed" | "failed" | "parsing" | "indexing" | "pending" | "idle" | "not_configured"
}

interface DocumentSetSelectorProps {
    fetchWithAuth: (input: RequestInfo, init?: RequestInit) => Promise<Response>
    selectedDocumentSet: string | null
    onSelectDocumentSet: (name: string | null) => void
}

const BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_URL

export function DocumentSetSelector({
    fetchWithAuth,
    selectedDocumentSet,
    onSelectDocumentSet,
}: DocumentSetSelectorProps) {
    const [isOpen, setIsOpen] = useState(false)
    const [documentSets, setDocumentSets] = useState<DocumentSet[]>([])
    const [loading, setLoading] = useState(false)

    const fetchDocumentSets = useCallback(async () => {
        setLoading(true)
        try {
            const response = await fetchWithAuth(`${BACKEND_URL}/api/rag/document-sets/`)
            if (response.ok) {
                const data = await response.json()
                const completedSets = (data.document_sets || []).filter((set: DocumentSet) => set.status === "completed")
                setDocumentSets(completedSets)
            }
        } catch (error) {
            console.error("Error fetching document sets:", error)
        } finally {
            setLoading(false)
        }
    }, [fetchWithAuth])

    useEffect(() => {
        if (isOpen) {
            fetchDocumentSets()
        }
    }, [isOpen, fetchDocumentSets])

    const handleSelect = (setName: string) => {
        onSelectDocumentSet(setName)
        setIsOpen(false)
    }

    const handleClear = () => {
        onSelectDocumentSet(null)
        setIsOpen(false)
    }

    return (
        <div className="relative">
            <button
                onClick={() => setIsOpen(!isOpen)}
                className={`flex items-center space-x-3 px-4 py-2 rounded-full border transition-all ${selectedDocumentSet
                        ? "bg-gradient-to-r from-blue-500 to-blue-600 text-white border-blue-400 shadow-lg shadow-blue-500/25"
                        : "bg-gray-900/50 text-gray-300 border-gray-700 hover:bg-gray-800/50 hover:border-gray-600"
                    }`}
            >
                <Database className="w-4 h-4" />
                <span className="text-sm font-medium">{selectedDocumentSet || "Select Documents"}</span>
                <ChevronDown className="w-4 h-4" />
            </button>

            {selectedDocumentSet && (
                <button
                    onClick={handleClear}
                    className="absolute -top-2 -right-2 w-6 h-6 bg-red-500 text-white rounded-full flex items-center justify-center hover:bg-red-600 transition-colors shadow-lg"
                >
                    <X className="w-3 h-3" />
                </button>
            )}

            {isOpen && (
                <div className="absolute top-full left-0 mt-2 w-80 bg-gray-900/95 backdrop-blur-sm border border-gray-700 rounded-2xl shadow-2xl z-50">
                    <div className="p-4 border-b border-gray-800">
                        <div className="flex items-center space-x-2">
                            <Sparkles className="w-5 h-5 text-blue-400" />
                            <h3 className="text-sm font-medium text-white">Available Document Sets</h3>
                        </div>
                    </div>

                    <div className="max-h-64 overflow-y-auto">
                        {loading ? (
                            <div className="p-6 text-center text-gray-400">
                                <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-500 mx-auto mb-3"></div>
                                <p className="text-sm">Loading document sets...</p>
                            </div>
                        ) : documentSets.length === 0 ? (
                            <div className="p-6 text-center text-gray-400">
                                <FileText className="w-8 h-8 mx-auto mb-3 text-gray-500" />
                                <p className="text-sm font-medium mb-1">No document sets available</p>
                                <p className="text-xs text-gray-500">Upload documents in the RAG admin panel</p>
                            </div>
                        ) : (
                            <div className="p-2">
                                {documentSets.map((set) => (
                                    <button
                                        key={set.name}
                                        onClick={() => handleSelect(set.name)}
                                        className={`w-full text-left p-4 rounded-xl hover:bg-gray-800/50 transition-all duration-200 ${selectedDocumentSet === set.name
                                                ? "bg-blue-500/20 border border-blue-500/30"
                                                : "border border-transparent"
                                            }`}
                                    >
                                        <div className="flex items-start justify-between">
                                            <div className="flex-1 min-w-0">
                                                <h4 className="text-sm font-medium text-white truncate mb-1">{set.name}</h4>
                                                <p className="text-xs text-gray-400 mb-1">
                                                    {set.document_count} document{set.document_count !== 1 ? "s" : ""}
                                                </p>
                                                <p className="text-xs text-gray-500">{new Date(set.created_at).toLocaleDateString()}</p>
                                            </div>
                                            <div className="flex-shrink-0 ml-3">
                                                <span className="inline-flex items-center px-2 py-1 rounded-full text-xs bg-green-500/20 text-green-400 border border-green-500/30">
                                                    Ready
                                                </span>
                                            </div>
                                        </div>
                                    </button>
                                ))}
                            </div>
                        )}
                    </div>

                    {documentSets.length > 0 && (
                        <div className="p-4 border-t border-gray-800">
                            <button
                                onClick={handleClear}
                                className="w-full text-center text-sm text-gray-400 hover:text-gray-300 transition-colors py-2"
                            >
                                Clear selection
                            </button>
                        </div>
                    )}
                </div>
            )}
        </div>
    )
}
