"use client";

import { useState, useRef, useCallback } from "react";
import { Upload, File, AlertCircle, CheckCircle, X } from "lucide-react";
import BrandedLoading from "@/components/ui/branded-loading";

const BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_URL;
const MAX_FILE_SIZE_MB = 100;
const MAX_TOTAL_SIZE_MB = 500;

interface DocumentUploadProps {
    fetchWithAuth: (input: RequestInfo, init?: RequestInit) => Promise<Response>;
    onUploadComplete: () => void;
    token: string;
}

export function DocumentUpload({ fetchWithAuth, onUploadComplete, token }: DocumentUploadProps) {
    const [documentSetName, setDocumentSetName] = useState("");
    const [files, setFiles] = useState<File[]>([]);
    const [isDragging, setIsDragging] = useState(false);
    const [uploading, setUploading] = useState(false);
    const [uploadStatus, setUploadStatus] = useState<{
        type: 'success' | 'error' | '';
        message: string;
    }>({ type: '', message: '' });
    const fileInputRef = useRef<HTMLInputElement>(null);

    const handleFileChange = (selectedFiles: FileList | null) => {
        if (!selectedFiles) return;

        const newFiles = Array.from(selectedFiles);
        let totalSize = files.reduce((acc, file) => acc + file.size, 0);
        const addedFiles: File[] = [];

        for (const file of newFiles) {
            if (file.type !== 'application/pdf') {
                setUploadStatus({ type: 'error', message: 'Only PDF files are allowed.' });
                continue;
            }
            if (file.size > MAX_FILE_SIZE_MB * 1024 * 1024) {
                setUploadStatus({ type: 'error', message: `File "${file.name}" exceeds ${MAX_FILE_SIZE_MB}MB limit.` });
                continue;
            }
            if (totalSize + file.size > MAX_TOTAL_SIZE_MB * 1024 * 1024) {
                setUploadStatus({ type: 'error', message: `Total upload size exceeds ${MAX_TOTAL_SIZE_MB}MB limit.` });
                break;
            }
            addedFiles.push(file);
            totalSize += file.size;
        }

        setFiles(prev => [...prev, ...addedFiles]);
        setUploadStatus({ type: '', message: '' });
    };

    const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
        handleFileChange(e.target.files);
    };

    const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
        e.preventDefault();
        e.stopPropagation();
        setIsDragging(false);
        handleFileChange(e.dataTransfer.files);
    };

    const handleDragEvents = (e: React.DragEvent<HTMLDivElement>) => {
        e.preventDefault();
        e.stopPropagation();
        if (e.type === "dragenter" || e.type === "dragover") {
            setIsDragging(true);
        } else if (e.type === "dragleave") {
            setIsDragging(false);
        }
    };

    const removeFile = (index: number) => {
        setFiles(files.filter((_, i) => i !== index));
    };

    const formatFileSize = (bytes: number) => {
        if (bytes === 0) return '0 Bytes';
        const k = 1024;
        const sizes = ['Bytes', 'KB', 'MB', 'GB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
    };

    const handleUpload = async () => {
        if (!documentSetName.trim()) {
            setUploadStatus({
                type: 'error',
                message: 'Please enter a document set name'
            });
            return;
        }

        if (files.length === 0) {
            setUploadStatus({
                type: 'error',
                message: 'Please select at least one PDF file'
            });
            return;
        }

        setUploading(true);
        setUploadStatus({ type: '', message: '' });

        try {
            const formData = new FormData();
            formData.append('document_set_name', documentSetName.trim());

            files.forEach((file) => {
                formData.append('files', file, file.name);
            });

            const response = await fetch(`${BACKEND_URL}/api/rag/upload/`, {
                method: 'POST',
                body: formData,
                headers: {
                    'Authorization': `Bearer ${token}`,
                    // Don't set Content-Type for FormData - let browser set it with boundary
                },
            });

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.error || 'Upload failed');
            }

            const result = await response.json();

            setUploadStatus({
                type: 'success',
                message: `Successfully uploaded ${files.length} file(s) to "${documentSetName}"`
            });

            // Reset form
            setDocumentSetName("");
            setFiles([]);
            onUploadComplete();
        } catch (error: any) {
            setUploadStatus({
                type: 'error',
                message: error instanceof Error ? error.message : 'Upload failed'
            });
        } finally {
            setUploading(false);
        }
    };

    return (
        <div className="bg-slate-900/50 border border-white/10 rounded-lg p-6 shadow-lg">
            <h2 className="text-xl font-bold text-white mb-4">Upload New Documents</h2>
            <div className="space-y-4">
                <input
                    type="text"
                    placeholder="Enter a name for this document set"
                    value={documentSetName}
                    onChange={(e) => setDocumentSetName(e.target.value)}
                    className="w-full bg-slate-800 border border-slate-700 rounded-md px-3 py-2 text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />

                <div
                    onDrop={handleDrop}
                    onDragOver={handleDragEvents}
                    onDragEnter={handleDragEvents}
                    onDragLeave={handleDragEvents}
                    className={`border-2 border-dashed rounded-lg p-8 text-center cursor-pointer transition-colors ${isDragging ? 'border-blue-500 bg-blue-500/10' : 'border-slate-600 hover:border-blue-500'}`}
                    onClick={() => fileInputRef.current?.click()}
                >
                    <input
                        type="file"
                        ref={fileInputRef}
                        multiple
                        accept="application/pdf"
                        onChange={handleFileSelect}
                        className="hidden"
                    />
                    <div className="flex flex-col items-center text-slate-400">
                        <Upload className="w-10 h-10 mb-2" />
                        <p className="font-semibold">
                            {isDragging ? 'Drop files here' : 'Drag & drop PDF files here, or click to select'}
                        </p>
                        <p className="text-xs mt-1">Max file size: {MAX_FILE_SIZE_MB}MB | Max total size: {MAX_TOTAL_SIZE_MB}MB</p>
                    </div>
                </div>

                {files.length > 0 && (
                    <div>
                        <h3 className="text-sm font-medium text-slate-400 mb-3">
                            Selected Files ({files.length})
                        </h3>
                        <div className="space-y-2">
                            {files.map((file, index) => (
                                <div key={index} className="flex items-center justify-between p-3 bg-slate-900/50 rounded-lg border border-white/10">
                                    <div className="flex items-center space-x-3">
                                        <File className="h-5 w-5 text-red-400" />
                                        <div>
                                            <p className="text-sm font-medium text-white">{file.name}</p>
                                            <p className="text-xs text-slate-400">{formatFileSize(file.size)}</p>
                                        </div>
                                    </div>
                                    {!uploading && (
                                        <button
                                            onClick={() => removeFile(index)}
                                            className="p-1 text-slate-400 hover:text-red-400 transition-colors hover:scale-110"
                                        >
                                            <X className="h-4 w-4" />
                                        </button>
                                    )}
                                </div>
                            ))}
                        </div>
                    </div>
                )}

                {/* Status Message */}
                {uploadStatus.message && (
                    <div className={`mb-6 p-4 rounded-lg flex items-center space-x-2 ${uploadStatus.type === 'success'
                        ? 'bg-green-400/10 text-green-400 border border-green-400/20'
                        : 'bg-red-400/10 text-red-400 border border-red-400/20'
                        }`}>
                        {uploadStatus.type === 'success' ? (
                            <CheckCircle className="h-5 w-5" />
                        ) : (
                            <AlertCircle className="h-5 w-5" />
                        )}
                        <span className="text-sm">{uploadStatus.message}</span>
                    </div>
                )}

                {/* Upload Button */}
                <div className="flex justify-end">
                    <button
                        onClick={handleUpload}
                        disabled={uploading || !documentSetName.trim() || files.length === 0}
                        className="bg-gradient-to-r from-blue-500 via-teal-500 to-emerald-500 px-6 py-3 rounded-lg font-medium text-white disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100 transition-all duration-200 hover:scale-105 flex items-center space-x-2"
                    >
                        {uploading ? (
                            <>
                                <BrandedLoading minimal text="Uploading..." />
                            </>
                        ) : (
                            <>
                                <Upload className="h-4 w-4" />
                                <span>Upload Documents</span>
                            </>
                        )}
                    </button>
                </div>
            </div>
        </div>
    );
}
