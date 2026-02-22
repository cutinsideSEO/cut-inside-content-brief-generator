import React, { useState, useCallback } from 'react';
import { Input, Select, Card } from '../../ui';
import Button from '../../Button';
import { UploadCloudIcon, XIcon, FileTextIcon, MiniSpinner, CheckIcon, AlertTriangleIcon, LinkIcon } from '../../Icon';
import type { ClientContextFile, ClientContextUrl, ContextFileCategory } from '../../../types/clientProfile';
import { CONTEXT_FILE_CATEGORY_LABELS } from '../../../types/clientProfile';
import { uploadClientContextFile, deleteClientContextFile, addClientContextUrl, deleteClientContextUrl } from '../../../services/clientContextService';

interface FilesUrlsSectionProps {
  clientId: string;
  files: ClientContextFile[];
  urls: ClientContextUrl[];
  onFilesChange: (files: ClientContextFile[]) => void;
  onUrlsChange: (urls: ClientContextUrl[]) => void;
}

const FilesUrlsSection: React.FC<FilesUrlsSectionProps> = ({
  clientId,
  files,
  urls,
  onFilesChange,
  onUrlsChange,
}) => {
  const [isDragOver, setIsDragOver] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [urlInput, setUrlInput] = useState('');
  const [urlLabel, setUrlLabel] = useState('');

  const handleFileUpload = useCallback(async (fileList: File[]) => {
    setUploading(true);
    for (const file of fileList) {
      const { data, error } = await uploadClientContextFile(clientId, file);
      if (data) {
        onFilesChange([...files, data]);
      }
    }
    setUploading(false);
  }, [clientId, files, onFilesChange]);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) handleFileUpload(Array.from(e.target.files));
  };

  const handleDrop = useCallback((e: React.DragEvent<HTMLLabelElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(false);
    if (e.dataTransfer.files?.length) {
      handleFileUpload(Array.from(e.dataTransfer.files));
      e.dataTransfer.clearData();
    }
  }, [handleFileUpload]);

  const handleRemoveFile = async (fileId: string) => {
    await deleteClientContextFile(fileId);
    onFilesChange(files.filter(f => f.id !== fileId));
  };

  const handleAddUrl = async () => {
    const trimmedUrl = urlInput.trim();
    if (!trimmedUrl) return;
    const { data } = await addClientContextUrl(clientId, trimmedUrl, urlLabel.trim() || undefined);
    if (data) {
      onUrlsChange([...urls, data]);
    }
    setUrlInput('');
    setUrlLabel('');
  };

  const handleRemoveUrl = async (urlId: string) => {
    await deleteClientContextUrl(urlId);
    onUrlsChange(urls.filter(u => u.id !== urlId));
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-lg font-heading font-semibold text-foreground mb-1">Files & URLs</h2>
        <p className="text-sm text-muted-foreground">Upload brand guidelines, style guides, and reference URLs</p>
      </div>

      {/* File Upload */}
      <div>
        <label className="block text-sm font-medium text-foreground mb-2">Context Files</label>
        <label
          className={`flex flex-col items-center justify-center w-full h-24 border-2 border-dashed rounded-lg cursor-pointer transition-all ${
            isDragOver
              ? 'border-teal bg-teal/10'
              : 'border-gray-200 bg-gray-50 hover:bg-gray-100 hover:border-gray-300'
          }`}
          onDrop={handleDrop}
          onDragEnter={(e) => { e.preventDefault(); setIsDragOver(true); }}
          onDragLeave={(e) => { e.preventDefault(); setIsDragOver(false); }}
          onDragOver={(e) => e.preventDefault()}
        >
          <div className="flex flex-col items-center justify-center py-3">
            {uploading ? (
              <MiniSpinner className="w-6 h-6 mb-1 text-gray-400" />
            ) : (
              <UploadCloudIcon className="w-6 h-6 mb-1 text-gray-400" />
            )}
            <p className="text-xs text-gray-600">
              <span className="font-semibold text-teal">Click to upload</span> or drag and drop
            </p>
            <p className="text-xs text-gray-400 mt-0.5">PDF, DOCX, TXT, MD</p>
          </div>
          <input type="file" className="hidden" accept=".pdf,.docx,.txt,.md" onChange={handleFileChange} multiple />
        </label>

        {files.length > 0 && (
          <div className="mt-3 space-y-1.5">
            {files.map(file => (
              <div key={file.id} className="bg-gray-50 p-2.5 rounded-md border border-gray-200 flex items-center justify-between">
                <div className="flex items-center gap-2 overflow-hidden">
                  <FileTextIcon className="h-4 w-4 text-teal flex-shrink-0" />
                  <div className="overflow-hidden">
                    <p className="text-sm font-medium text-foreground truncate">{file.file_name}</p>
                    <p className="text-xs text-muted-foreground">
                      {CONTEXT_FILE_CATEGORY_LABELS[file.category] || 'General'}
                      {file.description && ` — ${file.description}`}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-1.5 flex-shrink-0">
                  {file.parse_status === 'parsing' && <MiniSpinner className="h-3.5 w-3.5 text-gray-400" />}
                  {file.parse_status === 'done' && !file.parse_error && <CheckIcon className="h-3.5 w-3.5 text-emerald-500" />}
                  {file.parse_status === 'error' && <AlertTriangleIcon className="h-3.5 w-3.5 text-red-500" />}
                  <Button variant="ghost" size="sm" onClick={() => handleRemoveFile(file.id)} className="!p-1">
                    <XIcon className="h-3.5 w-3.5" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* URL Input */}
      <div>
        <label className="block text-sm font-medium text-foreground mb-2">Reference URLs</label>
        <div className="flex items-end gap-2">
          <div className="flex-1">
            <label className="block text-xs text-muted-foreground mb-1">URL</label>
            <Input
              type="url"
              value={urlInput}
              onChange={(e) => setUrlInput(e.target.value)}
              placeholder="https://..."
              size="sm"
            />
          </div>
          <div className="w-40">
            <label className="block text-xs text-muted-foreground mb-1">Label (optional)</label>
            <Input
              value={urlLabel}
              onChange={(e) => setUrlLabel(e.target.value)}
              placeholder="About Page"
              size="sm"
            />
          </div>
          <Button onClick={handleAddUrl} variant="secondary" size="sm">Add</Button>
        </div>

        {urls.length > 0 && (
          <div className="mt-3 space-y-1.5">
            {urls.map(url => (
              <div key={url.id} className="bg-gray-50 p-2.5 rounded-md border border-gray-200 flex items-center justify-between">
                <div className="flex items-center gap-2 overflow-hidden">
                  <LinkIcon className="h-4 w-4 text-teal flex-shrink-0" />
                  <div className="overflow-hidden">
                    <p className="text-sm font-medium text-foreground truncate">{url.label || url.url}</p>
                    {url.label && <p className="text-xs text-muted-foreground truncate">{url.url}</p>}
                  </div>
                </div>
                <div className="flex items-center gap-1.5 flex-shrink-0">
                  {url.scrape_status === 'scraping' && <MiniSpinner className="h-3.5 w-3.5 text-gray-400" />}
                  {url.scrape_status === 'done' && !url.scrape_error && <CheckIcon className="h-3.5 w-3.5 text-emerald-500" />}
                  {url.scrape_status === 'error' && <AlertTriangleIcon className="h-3.5 w-3.5 text-red-500" />}
                  <Button variant="ghost" size="sm" onClick={() => handleRemoveUrl(url.id)} className="!p-1">
                    <XIcon className="h-3.5 w-3.5" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default FilesUrlsSection;
