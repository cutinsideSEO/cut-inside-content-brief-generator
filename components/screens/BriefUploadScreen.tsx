import React, { useState, useCallback } from 'react';
import Button from '../Button';
import { AlertTriangleIcon, UploadCloudIcon, FileTextIcon } from '../Icon';
import Spinner from '../Spinner';

interface BriefUploadScreenProps {
  onFileUpload: (file: File) => void;
  isLoading: boolean;
  error: string | null;
  onBack: () => void;
}

const BriefUploadScreen: React.FC<BriefUploadScreenProps> = ({ onFileUpload, isLoading, error, onBack }) => {
  const [briefFile, setBriefFile] = useState<File | null>(null);
  const [isDragOver, setIsDragOver] = useState(false);
  const [localError, setLocalError] = useState('');

  const handleFileChange = (files: FileList | null) => {
    if (files && files.length > 0) {
      const file = files[0];
      if (file.type === 'text/markdown' || file.name.endsWith('.md')) {
        setBriefFile(file);
        setLocalError('');
      } else {
        setLocalError('Invalid file type. Please upload a Markdown (.md) file.');
        setBriefFile(null);
      }
    }
  };

  const handleDrop = useCallback((event: React.DragEvent<HTMLLabelElement>) => {
    event.preventDefault();
    event.stopPropagation();
    setIsDragOver(false);
    handleFileChange(event.dataTransfer.files);
  }, []);

  const handleDragEnter = (e: React.DragEvent<HTMLLabelElement>) => { e.preventDefault(); e.stopPropagation(); setIsDragOver(true); };
  const handleDragLeave = (e: React.DragEvent<HTMLLabelElement>) => { e.preventDefault(); e.stopPropagation(); setIsDragOver(false); };
  const handleDragOver = (e: React.DragEvent<HTMLLabelElement>) => { e.preventDefault(); e.stopPropagation(); };

  const handleSubmit = () => {
    if (briefFile) {
      onFileUpload(briefFile);
    } else {
      setLocalError('Please select a file to upload.');
    }
  };

  return (
    <div className="max-w-3xl mx-auto animate-fade-in">
      <div className="text-center mb-8">
        <h1 className="text-3xl font-heading font-bold text-gray-600">Upload Your Content Brief</h1>
        <p className="text-lg text-gray-600/70 mt-2">Upload an existing brief in Markdown (.md) format to begin content generation.</p>
      </div>

      <div className="bg-black/30 rounded-lg shadow-lg p-6 md:p-8 space-y-6 border border-white/10">
        {!briefFile ? (
          <label
            className={`flex flex-col items-center justify-center w-full h-48 border-2 border-dashed rounded-lg cursor-pointer transition-colors ${isDragOver ? 'border-teal bg-teal/10' : 'border-white/20 bg-black/50 hover:bg-white/5'}`}
            onDrop={handleDrop}
            onDragEnter={handleDragEnter}
            onDragLeave={handleDragLeave}
            onDragOver={handleDragOver}
          >
            <div className="flex flex-col items-center justify-center pt-5 pb-6">
              <UploadCloudIcon className="w-12 h-12 mb-3 text-gray-600/40" />
              <p className="text-md text-gray-600/60">
                <span className="font-semibold text-teal">Click to upload</span> or drag and drop
              </p>
              <p className="text-xs text-gray-600/50">Markdown (.md) files only</p>
            </div>
            <input
              type="file"
              className="hidden"
              accept=".md,text/markdown"
              onChange={(e) => handleFileChange(e.target.files)}
            />
          </label>
        ) : (
          <div className="bg-black/50 p-4 rounded-lg border border-white/10 text-center">
            <FileTextIcon className="h-12 w-12 text-teal mx-auto mb-2" />
            <p className="font-semibold text-gray-600">{briefFile.name}</p>
            <p className="text-xs text-gray-600/60">{Math.round(briefFile.size / 1024)} KB</p>
            <Button onClick={() => setBriefFile(null)} variant="secondary" size="sm" className="mt-4 w-auto">
              Choose a different file
            </Button>
          </div>
        )}

        <div className="flex items-center space-x-4 pt-4">
          <Button onClick={onBack} variant="secondary" className="w-1/2">
            Back
          </Button>
          <Button onClick={handleSubmit} disabled={isLoading || !briefFile} className="w-1/2">
            {isLoading ? <Spinner /> : 'Parse Brief & Continue'}
          </Button>
        </div>

        {(error || localError) && (
          <div className="mt-4 p-3 bg-red-900/50 border border-red-700 text-red-300 rounded-md flex items-start space-x-2">
            <AlertTriangleIcon className="h-5 w-5 mt-0.5 flex-shrink-0" />
            <p className="text-sm">{error || localError}</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default BriefUploadScreen;
