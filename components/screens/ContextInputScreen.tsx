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
            <h1 className="text-2xl font-heading font-bold text-text-primary">{header}</h1>
            <p className="text-md text-text-secondary mt-2">{message}</p>
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
    <div className="max-w-7xl mx-auto animate-fade-in">
        {isLoading ? (
            <ThemedLoader header="Analyzing Competitors..." />
        ) : (
            <div className="text-center mb-8">
                <div className="inline-flex items-center justify-center w-12 h-12 bg-status-complete/10 rounded-full mb-4">
                    <CheckIcon className="h-6 w-6 text-status-complete" />
                </div>
                <h1 className="text-2xl font-heading font-bold text-text-primary">Analysis Complete</h1>
                <p className="text-md text-text-secondary mt-2">You may now add optional context for the AI or continue to the next step.</p>
            </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            {/* Left Panel: Analysis Log */}
            <div className="lg:col-span-3">
                <Card variant="default" padding="md" className="sticky top-24">
                    <h3 className="text-sm font-heading font-semibold text-text-secondary uppercase tracking-wider mb-3">Analysis Log</h3>
                    <div
                        ref={logContainerRef}
                        className="h-96 bg-surface-hover rounded-radius-md p-3 border border-border-subtle overflow-y-auto font-mono text-xs"
                    >
                        {analysisLogs.map((log, index) => (
                            <p
                                key={index}
                                className={`${log.toLowerCase().includes('error') ? 'text-status-error' : 'text-text-muted'}`}
                            >
                                {log}
                            </p>
                        ))}
                    </div>
                </Card>
            </div>

            {/* Center Panel: Main Inputs */}
            <div className="lg:col-span-6 space-y-6">
                <Card variant="default" padding="lg">
                    <div className="flex items-center gap-3 mb-4">
                        <div className="w-10 h-10 rounded-radius-md bg-teal/10 flex items-center justify-center">
                            <FileTextIcon className="h-5 w-5 text-teal" />
                        </div>
                        <div>
                            <h2 className="text-lg font-heading font-semibold text-text-primary">Subject Matter Details</h2>
                            <p className="text-sm text-text-muted">Optional: Provide extra details about the topic for the AI</p>
                        </div>
                    </div>
                    <Textarea
                        value={subjectInfo}
                        onChange={(e) => setSubjectInfo(e.target.value)}
                        placeholder="e.g., Explain the core concepts, mention specific technologies to include..."
                        rows={5}
                        hint="Write details, upload files, or both"
                    />
                </Card>

                <Card variant="default" padding="lg">
                    <div className="flex items-center gap-3 mb-4">
                        <div className="w-10 h-10 rounded-radius-md bg-teal/10 flex items-center justify-center">
                            <svg className="h-5 w-5 text-teal" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                            </svg>
                        </div>
                        <div>
                            <h2 className="text-lg font-heading font-semibold text-text-primary">Brand Information</h2>
                            <p className="text-sm text-text-muted">Optional: Describe the brand voice, style, and target audience</p>
                        </div>
                    </div>
                    <Textarea
                        value={brandInfo}
                        onChange={(e) => setBrandInfo(e.target.value)}
                        placeholder="e.g., We are a B2B SaaS company. Our tone is professional yet approachable. Avoid jargon..."
                        rows={5}
                    />
                </Card>

                <Button onClick={onContinue} disabled={isLoading} fullWidth glow size="lg">
                    {isLoading ? "Analyzing..." : "Continue to Competitor Visualization"}
                </Button>
            </div>

            {/* Right Panel: Context Uploaders */}
            <div className="lg:col-span-3 space-y-6">
                {/* File Upload */}
                <Card variant="default" padding="md">
                    <h3 className="text-sm font-heading font-semibold text-text-secondary uppercase tracking-wider mb-1">Upload Context Files</h3>
                    <p className="text-xs text-text-muted mb-3">PDF, DOCX, TXT, or MD.</p>
                    <label
                        className={`flex flex-col items-center justify-center w-full h-28 border-2 border-dashed rounded-radius-lg cursor-pointer transition-all ${
                            isDragOver
                                ? 'border-teal bg-teal/10'
                                : 'border-border bg-surface-hover hover:bg-surface-active hover:border-border-emphasis'
                        }`}
                        onDrop={handleDrop}
                        onDragEnter={handleDragEnter}
                        onDragLeave={handleDragLeave}
                        onDragOver={handleDragOver}
                    >
                        <div className="flex flex-col items-center justify-center py-4">
                            <UploadCloudIcon className="w-8 h-8 mb-2 text-text-muted" />
                            <p className="text-sm text-text-secondary"><span className="font-semibold text-teal">Click to upload</span></p>
                        </div>
                        <input type="file" className="hidden" accept=".pdf,.docx,.txt,.md" onChange={handleFileChange} multiple />
                    </label>

                    {contextFiles.length > 0 && (
                        <div className="mt-4 space-y-2 max-h-48 overflow-y-auto">
                            {contextFiles.map(file => {
                                const status = fileContents.get(file.name);
                                return (
                                    <div key={file.name} className="bg-surface-hover p-2 rounded-radius-md border border-border-subtle flex items-center justify-between">
                                        <div className="flex items-center gap-2 overflow-hidden">
                                            <FileTextIcon className="h-4 w-4 text-teal flex-shrink-0" />
                                            <p className="text-xs font-medium text-text-primary truncate">{file.name}</p>
                                        </div>
                                        <div className="flex items-center gap-2">
                                            {status?.status === 'parsing' && <MiniSpinner className="h-4 w-4 text-text-muted" />}
                                            {status?.status === 'done' && !status.error && <CheckIcon className="h-4 w-4 text-status-complete" />}
                                            {status?.status === 'done' && status.error && <AlertTriangleIcon className="h-4 w-4 text-status-error" />}
                                            <Button variant="ghost" size="sm" onClick={() => onRemoveFile(file.name)} className="!p-1">
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
                <Card variant="default" padding="md">
                    <h3 className="text-sm font-heading font-semibold text-text-secondary uppercase tracking-wider mb-1">Scrape Context URLs</h3>
                    <p className="text-xs text-text-muted mb-3">Add URLs to include their content</p>
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
                        <div className="mt-4 space-y-2 max-h-48 overflow-y-auto">
                            {Array.from(urlContents.entries()).map(([url, status]) => (
                                <div key={url} className="bg-surface-hover p-2 rounded-radius-md border border-border-subtle flex items-center justify-between">
                                    <div className="flex items-center gap-2 overflow-hidden">
                                        <LinkIcon className="h-4 w-4 text-teal flex-shrink-0" />
                                        <p className="text-xs font-medium text-text-primary truncate">{url}</p>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        {status?.status === 'scraping' && <MiniSpinner className="h-4 w-4 text-text-muted" />}
                                        {status?.status === 'done' && !status.error && <CheckIcon className="h-4 w-4 text-status-complete" />}
                                        {status?.status === 'done' && status.error && <AlertTriangleIcon className="h-4 w-4 text-status-error" />}
                                        <Button variant="ghost" size="sm" onClick={() => onRemoveUrl(url)} className="!p-1">
                                            <XIcon className="h-3 w-3" />
                                        </Button>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </Card>
            </div>
        </div>
    </div>
  );
};

export default ContextInputScreen;
