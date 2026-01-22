'use client';

import { cn } from '@/lib/utils';

interface AlertModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm?: () => void;
  title: string;
  message: string;
  type?: 'success' | 'error' | 'info' | 'warning';
  confirmLabel?: string;
  cancelLabel?: string;
}

export default function AlertModal({
  isOpen,
  onClose,
  onConfirm,
  title,
  message,
  type = 'info',
  confirmLabel = 'Continue',
  cancelLabel = 'Cancel'
}: AlertModalProps) {
  if (!isOpen) return null;

  const colors = {
    success: {
      bg: 'bg-green-50',
      border: 'border-green-200',
      title: 'text-green-800',
      button: 'bg-green-600 hover:bg-green-700'
    },
    error: {
      bg: 'bg-red-50',
      border: 'border-red-200',
      title: 'text-red-800',
      button: 'bg-red-600 hover:bg-red-700'
    },
    info: {
      bg: 'bg-blue-50',
      border: 'border-blue-200',
      title: 'text-blue-800',
      button: 'bg-blue-600 hover:bg-blue-700'
    },
    warning: {
      bg: 'bg-yellow-50',
      border: 'border-yellow-200',
      title: 'text-yellow-800',
      button: 'bg-yellow-600 hover:bg-yellow-700'
    }
  };

  const color = colors[type];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/50" onClick={onClose} />
      <div
        className={cn(
          'relative mx-4 w-full max-w-sm rounded-lg border-2 bg-white p-6 shadow-xl',
          color.border
        )}
      >
        <div className={cn('mb-4 rounded-lg p-4', color.bg)}>
          <h3 className={cn('mb-2 text-lg font-semibold', color.title)}>
            {title}
          </h3>
          <p className="text-gray-700">{message}</p>
        </div>
        <div className="flex justify-end gap-3">
          {onConfirm ? (
            <>
              <button
                onClick={onClose}
                className="cursor-pointer rounded bg-gray-100 px-6 py-2 text-sm font-medium text-gray-700 transition hover:bg-gray-200"
              >
                {cancelLabel}
              </button>
              <button
                onClick={onConfirm}
                className={cn(
                  'cursor-pointer rounded px-6 py-2 text-sm font-medium text-white transition',
                  color.button
                )}
              >
                {confirmLabel}
              </button>
            </>
          ) : (
            <button
              onClick={onClose}
              className={cn(
                'cursor-pointer rounded px-6 py-2 text-sm font-medium text-white transition',
                color.button
              )}
            >
              OK
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
