import React, { useRef, useEffect, useCallback, useState } from 'react';
import Spinner from '../Spinner';
import Button from '../Button';
import { UploadCloudIcon, XIcon, FileTextIcon, MiniSpinner, CheckIcon, AlertTriangleIcon, LinkIcon } from '../Icon';
import { THEMED_LOADING_MESSAGES } from '../../constants';


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
        <div className="text-center mb-8">
            <div className="flex justify-center items-center mb-4">
                <Spinner />
            </div>
            <h1 className="text-2xl font-heading font-bold text-grey">{header}</h1>
            <p className="text-md text-grey/70">{message}</p>
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
                <h1 className="text-2xl font-heading font-bold text-grey">Analysis Complete</h1>
                <p className="text-md text-grey/70">You may now add optional context for the AI or continue to the next step.</p>
            </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            {/* Left Panel: Analysis Log */}
            <div className="lg:col-span-3">
                <div className="bg-black/30 p-4 rounded-lg border border-white/10 sticky top-24">
                    <h3 className="text-md font-heading font-semibold text-grey/80 mb-2">Analysis Log</h3>
                    <div ref={logContainerRef} className="h-96 bg-black/50 rounded-md p-3 border border-white/10 overflow-y-auto">
                    {analysisLogs.map((log, index) => (
                        <p key={index} className={`text-xs font-mono ${log.toLowerCase().includes('error') ? 'text-red-400' : 'text-grey/60'}`}>
                        {log}
                        </p>
                    ))}
                    </div>
                </div>
            </div>

            {/* Center Panel: Main Inputs */}
            <div className="lg:col-span-6 space-y-6">
                <div className="bg-black/30 p-6 rounded-lg border border-white/10">
                    <h2 className="text-lg font-heading font-semibold text-grey mb-1">Add Subject Matter Details (Optional)</h2>
                    <p className="text-sm text-grey/60">Provide extra details about the topic for the AI. You can write in the box below, upload files, or both.</p>
                    <textarea 
                        value={subjectInfo} 
                        onChange={(e) => setSubjectInfo(e.target.value)} 
                        placeholder="e.g., Explain the core concepts, mention specific technologies to include..." 
                        className="w-full mt-2 p-3 bg-black border border-white/20 rounded-md text-grey h-32 resize-none focus:ring-2 focus:ring-teal" 
                    />
                </div>
                 <div className="bg-black/30 p-6 rounded-lg border border-white/10">
                    <h2 className="text-lg font-heading font-semibold text-grey mb-1">Add Brand Information (Optional)</h2>
                    <p className="text-sm text-grey/60">Describe the brand voice, style, and target audience.</p>
                    <textarea 
                        value={brandInfo} 
                        onChange={(e) => setBrandInfo(e.target.value)} 
                        placeholder="e.g., We are a B2B SaaS company. Our tone is professional yet approachable. Avoid jargon..." 
                        className="w-full mt-2 p-3 bg-black border border-white/20 rounded-md text-grey h-32 resize-none focus:ring-2 focus:ring-teal" 
                    />
                </div>
                <Button onClick={onContinue} disabled={isLoading} className="w-full !py-4">
                    {isLoading ? "Analyzing..." : "Continue to Competitor Visualization"}
                </Button>
            </div>

            {/* Right Panel: Context Uploaders */}
            <div className="lg:col-span-3 space-y-6">
                <div className="bg-black/30 p-4 rounded-lg border border-white/10">
                    <h3 className="text-md font-heading font-semibold text-grey mb-1">Upload Context Files</h3>
                    <p className="text-sm text-grey/60">PDF, DOCX, TXT, or MD.</p>
                    <label 
                        className={`flex flex-col items-center justify-center w-full h-32 mt-2 border-2 border-dashed rounded-lg cursor-pointer transition-colors ${isDragOver ? 'border-teal bg-teal/10' : 'border-white/20 bg-black/50 hover:bg-white/5'}`}
                        onDrop={handleDrop} onDragEnter={handleDragEnter} onDragLeave={handleDragLeave} onDragOver={handleDragOver}
                    >
                        <div className="flex flex-col items-center justify-center pt-5 pb-6">
                            <UploadCloudIcon className="w-10 h-10 mb-2 text-grey/40" />
                            <p className="text-sm text-grey/60"><span className="font-semibold text-teal">Click to upload</span></p>
                        </div>
                        <input type="file" className="hidden" accept=".pdf,.docx,.txt,.md" onChange={handleFileChange} multiple />
                    </label>
                    {contextFiles.length > 0 && (
                        <div className="mt-4 space-y-2 max-h-48 overflow-y-auto">
                            {contextFiles.map(file => {
                                const status = fileContents.get(file.name);
                                return (
                                    <div key={file.name} className="bg-black/50 p-2 rounded-lg border border-white/10 flex items-center justify-between text-xs">
                                        <div className="flex items-center space-x-2 overflow-hidden">
                                            <FileTextIcon className="h-5 w-5 text-teal flex-shrink-0" />
                                            <p className="font-semibold text-grey truncate">{file.name}</p>
                                        </div>
                                        <div className="flex items-center space-x-2">
                                            {status?.status === 'parsing' && <MiniSpinner className="h-4 w-4 text-grey/60" />}
                                            {status?.status === 'done' && !status.error && <CheckIcon className="h-4 w-4 text-teal" />}
                                            {status?.status === 'done' && status.error && (
                                                <div className="relative group"><AlertTriangleIcon className="h-4 w-4 text-red-500" /></div>
                                            )}
                                            <button onClick={() => onRemoveFile(file.name)} className="p-0.5 text-grey/50 hover:text-white rounded-full hover:bg-white/10"><XIcon className="h-4 w-4" /></button>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    )}
                </div>

                 <div className="bg-black/30 p-4 rounded-lg border border-white/10">
                    <h3 className="text-md font-heading font-semibold text-grey mb-1">Scrape Context URLs</h3>
                    <div className="flex items-center space-x-2 mt-2">
                        <input type="url" value={urlInput} onChange={(e) => setUrlInput(e.target.value)} placeholder="https://..."
                            className="flex-grow p-2 bg-black border border-white/20 rounded-md text-grey focus:ring-2 focus:ring-teal text-sm"
                            onKeyDown={(e) => { if (e.key === 'Enter') handleAddUrl(); }}
                        />
                        <Button onClick={handleAddUrl} variant="outline" size="sm" className="w-auto px-3 !py-2">Add</Button>
                    </div>

                    {Array.from(urlContents.keys()).length > 0 && (
                        <div className="mt-4 space-y-2 max-h-48 overflow-y-auto">
                            {Array.from(urlContents.entries()).map(([url, status]) => (
                                <div key={url} className="bg-black/50 p-2 rounded-lg border border-white/10 flex items-center justify-between text-xs">
                                     <div className="flex items-center space-x-2 overflow-hidden">
                                        <LinkIcon className="h-5 w-5 text-teal flex-shrink-0" />
                                        <p className="font-semibold text-grey truncate">{url}</p>
                                    </div>
                                    <div className="flex items-center space-x-2">
                                        {status?.status === 'scraping' && <MiniSpinner className="h-4 w-4 text-grey/60" />}
                                        {status?.status === 'done' && !status.error && <CheckIcon className="h-4 w-4 text-teal" />}
                                        {status?.status === 'done' && status.error && (
                                            <div className="relative group"><AlertTriangleIcon className="h-4 w-4 text-red-500" /></div>
                                        )}
                                        <button onClick={() => onRemoveUrl(url)} className="p-0.5 text-grey/50 hover:text-white rounded-full hover:bg-white/10"><XIcon className="h-4 w-4" /></button>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            </div>
        </div>
    </div>
  );
};

export default ContextInputScreen;