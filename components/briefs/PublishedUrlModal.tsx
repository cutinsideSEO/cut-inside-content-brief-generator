// Published URL Modal - Collects URL and date when marking content as published
import React, { useState, useEffect, useMemo } from 'react';
import { Modal, Input } from '../ui';
import Button from '../Button';

interface PublishedUrlModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (url: string, publishedAt?: string) => void;
  existingUrl?: string | null;
}

function getTodayString(): string {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function isValidUrl(value: string): boolean {
  return value.startsWith('http://') || value.startsWith('https://');
}

const PublishedUrlModal: React.FC<PublishedUrlModalProps> = ({
  isOpen,
  onClose,
  onConfirm,
  existingUrl,
}) => {
  const [url, setUrl] = useState('');
  const [publishedAt, setPublishedAt] = useState('');

  // Reset fields when modal opens
  useEffect(() => {
    if (isOpen) {
      setUrl(existingUrl || '');
      setPublishedAt(getTodayString());
    }
  }, [isOpen, existingUrl]);

  const urlValid = useMemo(() => isValidUrl(url.trim()), [url]);
  const canConfirm = url.trim().length > 0 && urlValid;

  const handleConfirm = () => {
    if (!canConfirm) return;
    onConfirm(url.trim(), publishedAt || undefined);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && canConfirm) {
      e.preventDefault();
      handleConfirm();
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Set Published URL"
      size="md"
      footer={
        <>
          <Button variant="secondary" size="sm" onClick={onClose}>
            Cancel
          </Button>
          <Button
            variant="primary"
            size="sm"
            onClick={handleConfirm}
            disabled={!canConfirm}
          >
            Confirm
          </Button>
        </>
      }
    >
      <div className="space-y-4" onKeyDown={handleKeyDown}>
        <Input
          label="Published URL"
          placeholder="https://example.com/article-slug"
          value={url}
          onChange={(e) => setUrl(e.target.value)}
          error={url.trim().length > 0 && !urlValid ? 'URL must start with http:// or https://' : undefined}
          size="sm"
        />
        <Input
          label="Published Date"
          type="date"
          value={publishedAt}
          onChange={(e) => setPublishedAt(e.target.value)}
          size="sm"
        />
      </div>
    </Modal>
  );
};

export default PublishedUrlModal;
