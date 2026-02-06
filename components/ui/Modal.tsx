import React from 'react';
import * as DialogPrimitive from '@radix-ui/react-dialog';
import { X } from 'lucide-react';
import { cn } from '@/lib/utils';

export interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title?: string;
  size?: 'sm' | 'md' | 'lg' | 'xl';
  children: React.ReactNode;
  footer?: React.ReactNode;
  closeOnBackdrop?: boolean;
  closeOnEscape?: boolean;
}

const sizeStyles = {
  sm: 'max-w-sm',
  md: 'max-w-md',
  lg: 'max-w-lg',
  xl: 'max-w-xl',
};

const Modal: React.FC<ModalProps> = ({
  isOpen,
  onClose,
  title,
  size = 'md',
  children,
  footer,
  closeOnBackdrop = true,
  closeOnEscape = true,
}) => {
  return (
    <DialogPrimitive.Root open={isOpen} onOpenChange={(open) => { if (!open) onClose(); }}>
      <DialogPrimitive.Portal>
        <DialogPrimitive.Overlay className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm animate-fade-in" />
        <DialogPrimitive.Content
          className={cn(
            'fixed left-[50%] top-[50%] z-50 translate-x-[-50%] translate-y-[-50%]',
            'w-full',
            sizeStyles[size],
            'bg-card border border-border',
            'rounded-xl shadow-card-elevated',
            'animate-scale-in',
            'focus:outline-none'
          )}
          onPointerDownOutside={(e) => { if (!closeOnBackdrop) e.preventDefault(); }}
          onEscapeKeyDown={(e) => { if (!closeOnEscape) e.preventDefault(); }}
        >
          {/* Header */}
          {title && (
            <div className="flex items-center justify-between p-5 border-b border-border">
              <DialogPrimitive.Title className="font-heading font-semibold text-lg text-foreground">
                {title}
              </DialogPrimitive.Title>
              <DialogPrimitive.Close
                className="text-gray-400 hover:text-gray-600 transition-colors p-1 -m-1 rounded-md hover:bg-gray-100"
                aria-label="Close modal"
              >
                <X className="w-5 h-5" />
              </DialogPrimitive.Close>
            </div>
          )}

          {/* Visually-hidden title for accessibility when no visible title */}
          {!title && (
            <DialogPrimitive.Title className="sr-only">Dialog</DialogPrimitive.Title>
          )}

          {/* Body */}
          <div className="p-5 custom-scrollbar max-h-[70vh] overflow-y-auto">{children}</div>

          {/* Footer */}
          {footer && (
            <div className="flex items-center justify-end gap-3 p-5 border-t border-border">{footer}</div>
          )}
        </DialogPrimitive.Content>
      </DialogPrimitive.Portal>
    </DialogPrimitive.Root>
  );
};

export default Modal;
