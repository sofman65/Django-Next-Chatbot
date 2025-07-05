"use client"

import { useState, useEffect, useCallback } from "react"
import { FileText, Database, ChevronDown, X, Sparkles, Search, FolderOpen } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetClose } from "@/components/ui/sheet"
import { Separator } from "@/components/ui/separator"

interface DocumentSet {
    name: string
    document_count: number
    created_at: string
    status: "processing" | "completed" | "failed" | "parsing" | "indexing" | "pending" | "idle" | "not_configured"
}

interface DocumentSelectorModalProps {
    fetchWithAuth: (input: RequestInfo, init?: RequestInit) => Promise<Response>
    selectedDocumentSet: string | null
    onSelectDocumentSet: (name: string | null) => void
    isOpen: boolean
    onOpenChange: (open: boolean) => void
}

const BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_URL

export function DocumentSelectorModal({
    fetchWithAuth,
    selectedDocumentSet,
    onSelectDocumentSet,
    isOpen,
    onOpenChange
}: DocumentSelectorModalProps) {
    const [documentSets, setDocumentSets] = useState<DocumentSet[]>([])
    const [loading, setLoading] = useState(false)
    const [searchQuery, setSearchQuery] = useState("")

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
        onOpenChange(false)
    }

    const handleClear = () => {
        onSelectDocumentSet(null)
        onOpenChange(false)
    }

    const filteredDocumentSets = documentSets.filter(set =>
        set.name.toLowerCase().includes(searchQuery.toLowerCase())
    )

    return (
        <Sheet open={isOpen} onOpenChange={onOpenChange}>
            <SheetContent className="bg-gray-900/95 backdrop-blur-sm border-gray-700 text-white shadow-2xl overflow-y-auto">
                <SheetHeader>
                    <SheetTitle className="flex items-center gap-2 text-xl text-white">
                        <Database className="w-5 h-5 text-blue-400" />
                        <span>Select Document Set</span>
                    </SheetTitle>
                </SheetHeader>

                <div className="p-2">
                    <div className="relative mb-4">
                        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                        <Input
                            placeholder="Search document sets..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="pl-9 bg-gray-800/60 border-gray-700 text-white placeholder:text-gray-400 w-full"
                        />
                    </div>

                    <Separator className="my-4 bg-gray-800" />

                    <div className="max-h-[400px] overflow-y-auto custom-scrollbar">
                        {loading ? (
                            <div className="p-6 text-center text-gray-400">
                                <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-500 mx-auto mb-3"></div>
                                <p className="text-sm">Loading document sets...</p>
                            </div>
                        ) : filteredDocumentSets.length === 0 ? (
                            <div className="p-6 text-center text-gray-400">
                                <FileText className="w-8 h-8 mx-auto mb-3 text-gray-500" />
                                <p className="text-sm font-medium mb-1">No document sets available</p>
                                <p className="text-xs text-gray-500">Upload documents in the RAG admin panel</p>

                                <Button
                                    variant="outline"
                                    className="mt-4 text-blue-400 border-blue-500/30 hover:bg-blue-500/20"
                                    onClick={() => window.open('/rag', '_blank')}
                                >
                                    <FolderOpen className="w-4 h-4 mr-2" />
                                    Upload Documents
                                </Button>
                            </div>
                        ) : (
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                {filteredDocumentSets.map((set) => (
                                    <button
                                        key={set.name}
                                        onClick={() => handleSelect(set.name)}
                                        className={`w-full text-left p-4 rounded-xl hover:bg-gray-800/50 transition-all duration-200 ${selectedDocumentSet === set.name
                                                ? "bg-blue-500/20 border border-blue-500/30"
                                                : "border border-gray-700/50"
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

                    <Separator className="my-4 bg-gray-800" />

                    <div className="flex justify-between">
                        <Button
                            onClick={handleClear}
                            variant="ghost"
                            className="text-gray-400 hover:text-white hover:bg-gray-800"
                        >
                            <X className="w-4 h-4 mr-2" />
                            Clear Selection
                        </Button>

                        <Button
                            onClick={() => window.open('/rag', '_blank')}
                            variant="outline"
                            className="text-blue-400 border-blue-500/30 hover:bg-blue-500/20"
                        >
                            <FolderOpen className="w-4 h-4 mr-2" />
                            Manage Documents
                        </Button>
                    </div>
                </div>
            </SheetContent>
        </Sheet>
    )
}
