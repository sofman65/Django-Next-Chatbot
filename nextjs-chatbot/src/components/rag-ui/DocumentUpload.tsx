"use client";

import { useState, useRef } from "react";
import { Upload, File, AlertCircle, CheckCircle, X } from "lucide-react";

const BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_URL;

interface DocumentUploadProps {
    fetchWithAuth: (input: RequestInfo, init?: RequestInit) => Promise<Response>;
    onUploadComplete: () => void;
    token: string;
}

export function DocumentUpload({ fetchWithAuth, onUploadComplete, token }: DocumentUploadProps) {
    const [documentSetName, setDocumentSetName] = useState("");
    const [files, setFiles] = useState<File[]>([]);
    const [uploading, setUploading] = useState(false);
    const [uploadStatus, setUploadStatus] = useState<{
        type: 'success' | 'error' | '';
        message: string;
    }>({ type: '', message: '' });
    const fileInputRef = useRef<HTMLInputElement>(null);

    const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
        const selectedFiles = Array.from(e.target.files || []);
        const pdfFiles = selectedFiles.filter(file => file.type === 'application/pdf');

        if (pdfFiles.length !== selectedFiles.length) {
            setUploadStatus({
                type: 'error',
                message: 'Only PDF files are allowed'
            });
            return;
        }

        setFiles(pdfFiles);
        setUploadStatus({ type: '', message: '' });
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

            files.forEach((file, index) => {
                formData.append(`files`, file);
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
            if (fileInputRef.current) {
                fileInputRef.current.value = "";
            }

            onUploadComplete();

        } catch (error) {
            setUploadStatus({
                type: 'error',
                message: error instanceof Error ? error.message : 'Upload failed'
            });
        } finally {
            setUploading(false);
        }
    };

    return (
        <div className="w-full max-w-4xl mx-auto p-4 sm:p-6">
            <div className="bg-white rounded-lg shadow-sm border border-gray-200">
                <div className="p-4 sm:p-6">
                    <h2 className="text-xl sm:text-2xl font-bold text-gray-900 mb-4 sm:mb-6">Upload Documents</h2>

                    {/* Document Set Name */}
                    <div className="mb-6">
                        <label htmlFor="documentSetName" className="block text-sm font-medium text-gray-700 mb-2">
                            Document Set Name
                        </label>
                        <input
                            type="text"
                            id="documentSetName"
                            value={documentSetName}
                            onChange={(e) => setDocumentSetName(e.target.value)}
                            className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-[#3333CC] focus:border-[#3333CC]"
                            placeholder="Enter a name for this document set (e.g., 'Q1 Financial Reports')"
                            disabled={uploading}
                        />
                    </div>

                    {/* File Upload Area */}
                    <div className="mb-6">
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                            PDF Documents
                        </label>
                        <div
                            className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center hover:border-[#3333CC] transition-colors cursor-pointer"
                            onClick={() => fileInputRef.current?.click()}
                        >
                            <Upload className="mx-auto h-12 w-12 text-gray-400 mb-4" />
                            <p className="text-sm text-gray-600 mb-2">
                                Click to select PDF files or drag and drop
                            </p>
                            <p className="text-xs text-gray-500">
                                Multiple PDF files supported
                            </p>
                            <input
                                ref={fileInputRef}
                                type="file"
                                multiple
                                accept=".pdf"
                                onChange={handleFileSelect}
                                className="hidden"
                                disabled={uploading}
                            />
                        </div>
                    </div>

                    {/* Selected Files */}
                    {files.length > 0 && (
                        <div className="mb-6">
                            <h3 className="text-sm font-medium text-gray-700 mb-3">
                                Selected Files ({files.length})
                            </h3>
                            <div className="space-y-2">
                                {files.map((file, index) => (
                                    <div key={index} className="flex items-center justify-between p-3 bg-gray-50 rounded-md">
                                        <div className="flex items-center space-x-3">
                                            <File className="h-5 w-5 text-red-500" />
                                            <div>
                                                <p className="text-sm font-medium text-gray-900">{file.name}</p>
                                                <p className="text-xs text-gray-500">{formatFileSize(file.size)}</p>
                                            </div>
                                        </div>
                                        {!uploading && (
                                            <button
                                                onClick={() => removeFile(index)}
                                                className="p-1 text-gray-400 hover:text-red-500 transition-colors"
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
                        <div className={`mb-6 p-4 rounded-md flex items-center space-x-2 ${uploadStatus.type === 'success'
                            ? 'bg-green-50 text-green-800 border border-green-200'
                            : 'bg-red-50 text-red-800 border border-red-200'
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
                            className="bg-[#3333CC] text-white px-6 py-2 rounded-md hover:bg-[#2929AA] disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors flex items-center space-x-2"
                        >
                            {uploading ? (
                                <>
                                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                                    <span>Uploading...</span>
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
        </div>
    );
}
