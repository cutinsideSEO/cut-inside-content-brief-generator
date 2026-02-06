import React, { useRef, useEffect, useCallback, useState } from 'react';
import Spinner from '../Spinner';
import Button from '../Button';
import { UploadCloudIcon, XIcon, FileTextIcon, MiniSpinner, CheckIcon, AlertTriangleIcon, LinkIcon } from '../Icon';
import { THEMED_LOADING_MESSAGES } from '../../constants';
import { Card, Textarea, Input, Badge, Progress } from '../ui';


interface ContextInputScreenProps {
  subjectInfo: string;
  setSubjectInfo: (value: string) => void;
  brandInfo: string;
  setBrandInfo: (value: string) => void;
  analysisLogs: string[];
  isLoading: boolean;
  onContinue: () => void;
  contextFiles: File[];
  fileContents: Map<string, { content: string | null; error: string | null; status: 'pending' | 'parsing' | 'done' }>;
  onAddFiles: (files: File[]) => void;
  onRemoveFile: (fileName: string) => void;
  urlContents: Map<string, { content: string | null; error: string | null; status: 'pending' | 'scraping' | 'done' }>;
  onAddUrl: (url: string) => void;
  onRemoveUrl: (url: string) => void;
}

const ThemedLoader: React.FC<{ header: string }> = ({ header }) => {
    const [message, setMessage] = useState(THEMED_LOADING_MESSAGES[0]);

    useEffect(() => {
        const interval = setInterval(() => {
            setMessage(prev => {
                const currentIndex = THEMED_LOADING_MESSAGES.indexOf(prev);
                const nextIndex = (currentIndex + 1) % THEMED_LOADING_MESSAGES.length;
                return THEMED_LOADING_MESSAGES[nextIndex];
            });
        }, 2000);
        return () => clearInterval(interval);
    }, []);

    return (
        <div className="text-center mb-8 animate-fade-in">
            <div className="relative inline-flex mb-4">
                <div className="absolute inset-0 bg-teal/20 rounded-full blur-xl animate-pulse" />
                <div className="relative">
                    <Spinner />
                </div>
            </div>
            <h1 className="text-2xl font-heading font-bold text-gray-900">{header}</h1>
            <p className="text-md text-gray-600 mt-2">{message}</p>
        </div>
    );
};


const ContextInputScreen: React.FC<ContextInputScreenProps> = ({
  subjectInfo,
  setSubjectInfo,
  brandInfo,
  setBrandInfo,
  analysisLogs,
  isLoading,
  onContinue,
  contextFiles,
  fileContents,
  onAddFiles,
  onRemoveFile,
  urlContents,
  onAddUrl,
  onRemoveUrl,
}) => {
  const logContainerRef = useRef<HTMLDivElement>(null);
  const [isDragOver, setIsDragOver] = useState(false);
  const [urlInput, setUrlInput] = useState('');
  const [showLog, setShowLog] = useState(false);

  useEffect(() => {
    if (logContainerRef.current) {
      logContainerRef.current.scrollTop = logContainerRef.current.scrollHeight;
    }
  }, [analysisLogs]);

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    if (event.target.files) {
      onAddFiles(Array.from(event.target.files));
    }
  };

  const handleAddUrl = () => {
    if (urlInput.trim()) {
      onAddUrl(urlInput.trim());
      setUrlInput('');
    }
  };

  const handleDrop = useCallback((event: React.DragEvent<HTMLLabelElement>) => {
    event.preventDefault();
    event.stopPropagation();
    setIsDragOver(false);
    if (event.dataTransfer.files && event.dataTransfer.files.length > 0) {
      onAddFiles(Array.from(event.dataTransfer.files));
      event.dataTransfer.clearData();
    }
  }, [onAddFiles]);

  const handleDragEnter = (e: React.DragEvent<HTMLLabelElement>) => { e.preventDefault(); e.stopPropagation(); setIsDragOver(true); };
  const handleDragLeave = (e: React.DragEvent<HTMLLabelElement>) => { e.preventDefault(); e.stopPropagation(); setIsDragOver(false); };
  const handleDragOver = (e: React.DragEvent<HTMLLabelElement>) => { e.preventDefault(); e.stopPropagation(); };

  const formatBytes = (bytes: number, decimals = 2) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const dm = decimals < 0 ? 0 : decimals;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + ' ' + sizes[i];
  }

  return (
    <div className="max-w-5xl mx-auto animate-fade-in">
        {isLoading ? (
            <ThemedLoader header="Analyzing Competitors..." />
        ) : (
            <div className="text-center mb-8">
                <h1 className="text-2xl font-heading font-bold text-gray-900">Add context for the AI</h1>
                <p className="text-md text-gray-600 mt-2">Optional - provide additional information to improve the brief</p>
            </div>
        )}

        <div className="space-y-6">
            {/* Collapsible Analysis Log */}
            {analysisLogs.length > 0 && (
                <div>
                    <button
                        type="button"
                        onClick={() => setShowLog(!showLog)}
                        className="flex items-center gap-2 text-sm text-gray-400 hover:text-gray-600 transition-colors"
                    >
                        <svg
                            className={`h-4 w-4 transition-transform duration-200 ${showLog ? 'rotate-90' : ''}`}
                            fill="none"
                            viewBox="0 0 24 24"
                            stroke="currentColor"
                        >
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                        </svg>
                        <span className="font-heading font-semibold uppercase tracking-wider">Analysis Log ({analysisLogs.length})</span>
                    </button>
                    {showLog && (
                        <div className="mt-2">
                            <div
                                ref={logContainerRef}
                                className="h-48 bg-gray-50 rounded-md p-3 border border-gray-200 overflow-y-auto font-mono text-xs"
                            >
                                {analysisLogs.map((log, index) => (
                                    <p
                                        key={index}
                                        className={`${log.toLowerCase().includes('error') ? 'text-red-500' : 'text-gray-500'}`}
                                    >
                                        {log}
                                    </p>
                                ))}
                            </div>
                        </div>
                    )}
                </div>
            )}

            {/* Subject Matter & Brand Info - Side by Side */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Subject Matter Details */}
                <Card variant="default" padding="lg" className="h-fit">
                    <div className="flex items-center gap-3 mb-4">
                        <div className="w-8 h-8 rounded-md bg-teal/10 flex items-center justify-center">
                            <FileTextIcon className="h-4 w-4 text-teal" />
                        </div>
                        <div>
                            <h2 className="text-base font-heading font-semibold text-gray-900">Subject Matter Details</h2>
                            <p className="text-xs text-gray-400">Extra details about the topic</p>
                        </div>
                    </div>
                    <Textarea
                        value={subjectInfo}
                        onChange={(e) => setSubjectInfo(e.target.value)}
                        placeholder="e.g., Explain the core concepts, mention specific technologies to include..."
                        rows={4}
                        hint="Write details, upload files, or both"
                    />
                </Card>

                {/* Brand Information */}
                <Card variant="default" padding="lg" className="h-fit">
                    <div className="flex items-center gap-3 mb-4">
                        <div className="w-8 h-8 rounded-md bg-teal/10 flex items-center justify-center">
                            <svg className="h-4 w-4 text-teal" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                            </svg>
                        </div>
                        <div>
                            <h2 className="text-base font-heading font-semibold text-gray-900">Brand Information</h2>
                            <p className="text-xs text-gray-400">Brand voice, style, and audience</p>
                        </div>
                    </div>
                    <Textarea
                        value={brandInfo}
                        onChange={(e) => setBrandInfo(e.target.value)}
                        placeholder="e.g., We are a B2B SaaS company. Our tone is professional yet approachable. Avoid jargon..."
                        rows={4}
                    />
                </Card>
            </div>

            {/* File Upload & URL Scraper - Side by Side */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* File Upload */}
                <Card variant="default" padding="lg" className="h-fit">
                    <div className="flex items-center gap-3 mb-4">
                        <div className="w-8 h-8 rounded-md bg-teal/10 flex items-center justify-center">
                            <UploadCloudIcon className="h-4 w-4 text-teal" />
                        </div>
                        <div>
                            <h2 className="text-base font-heading font-semibold text-gray-900">Upload Context Files</h2>
                            <p className="text-xs text-gray-400">PDF, DOCX, TXT, or MD files</p>
                        </div>
                    </div>
                    <label
                        className={`flex flex-col items-center justify-center w-full h-24 border-2 border-dashed rounded-lg cursor-pointer transition-all ${
                            isDragOver
                                ? 'border-teal bg-teal/10'
                                : 'border-gray-200 bg-gray-50 hover:bg-gray-100 hover:border-gray-300'
                        }`}
                        onDrop={handleDrop}
                        onDragEnter={handleDragEnter}
                        onDragLeave={handleDragLeave}
                        onDragOver={handleDragOver}
                    >
                        <div className="flex flex-col items-center justify-center py-3">
                            <UploadCloudIcon className="w-6 h-6 mb-1 text-gray-400" />
                            <p className="text-xs text-gray-600"><span className="font-semibold text-teal">Click to upload</span> or drag and drop</p>
                        </div>
                        <input type="file" className="hidden" accept=".pdf,.docx,.txt,.md" onChange={handleFileChange} multiple />
                    </label>

                    {contextFiles.length > 0 && (
                        <div className="mt-3 space-y-1.5 max-h-32 overflow-y-auto">
                            {contextFiles.map(file => {
                                const status = fileContents.get(file.name);
                                return (
                                    <div key={file.name} className="bg-gray-50 p-2 rounded-md border border-gray-200 flex items-center justify-between">
                                        <div className="flex items-center gap-2 overflow-hidden">
                                            <FileTextIcon className="h-3.5 w-3.5 text-teal flex-shrink-0" />
                                            <p className="text-xs font-medium text-gray-900 truncate">{file.name}</p>
                                        </div>
                                        <div className="flex items-center gap-1.5">
                                            {status?.status === 'parsing' && <MiniSpinner className="h-3.5 w-3.5 text-gray-400" />}
                                            {status?.status === 'done' && !status.error && <CheckIcon className="h-3.5 w-3.5 text-emerald-500" />}
                                            {status?.status === 'done' && status.error && <AlertTriangleIcon className="h-3.5 w-3.5 text-red-500" />}
                                            <Button variant="ghost" size="sm" onClick={() => onRemoveFile(file.name)} className="!p-0.5">
                                                <XIcon className="h-3 w-3" />
                                            </Button>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    )}
                </Card>

                {/* URL Scraper */}
                <Card variant="default" padding="lg" className="h-fit">
                    <div className="flex items-center gap-3 mb-4">
                        <div className="w-8 h-8 rounded-md bg-teal/10 flex items-center justify-center">
                            <LinkIcon className="h-4 w-4 text-teal" />
                        </div>
                        <div>
                            <h2 className="text-base font-heading font-semibold text-gray-900">Scrape Context URLs</h2>
                            <p className="text-xs text-gray-400">Add URLs for additional context</p>
                        </div>
                    </div>
                    <div className="flex items-center gap-2">
                        <Input
                            type="url"
                            value={urlInput}
                            onChange={(e) => setUrlInput(e.target.value)}
                            placeholder="https://..."
                            onKeyDown={(e) => { if (e.key === 'Enter') handleAddUrl(); }}
                            size="sm"
                        />
                        <Button onClick={handleAddUrl} variant="secondary" size="sm">Add</Button>
                    </div>

                    {Array.from(urlContents.keys()).length > 0 && (
                        <div className="mt-3 space-y-1.5 max-h-32 overflow-y-auto">
                            {Array.from(urlContents.entries()).map(([url, status]) => (
                                <div key={url} className="bg-gray-50 p-2 rounded-md border border-gray-200 flex items-center justify-between">
                                    <div className="flex items-center gap-2 overflow-hidden">
                                        <LinkIcon className="h-3.5 w-3.5 text-teal flex-shrink-0" />
                                        <p className="text-xs font-medium text-gray-900 truncate">{url}</p>
                                    </div>
                                    <div className="flex items-center gap-1.5">
                                        {status?.status === 'scraping' && <MiniSpinner className="h-3.5 w-3.5 text-gray-400" />}
                                        {status?.status === 'done' && !status.error && <CheckIcon className="h-3.5 w-3.5 text-emerald-500" />}
                                        {status?.status === 'done' && status.error && <AlertTriangleIcon className="h-3.5 w-3.5 text-red-500" />}
                                        <Button variant="ghost" size="sm" onClick={() => onRemoveUrl(url)} className="!p-0.5">
                                            <XIcon className="h-3 w-3" />
                                        </Button>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </Card>
            </div>

            {/* Bottom Actions */}
            <div className="flex flex-col items-center gap-3 pt-2 pb-4 max-w-md mx-auto">
                <Button onClick={onContinue} disabled={isLoading} fullWidth glow size="lg">
                    {isLoading ? "Analyzing..." : "Continue"}
                </Button>
                <button
                    type="button"
                    onClick={onContinue}
                    disabled={isLoading}
                    className="text-sm text-gray-400 hover:text-gray-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                    Skip this step
                </button>
            </div>
        </div>
    </div>
  );
};

export default ContextInputScreen;
