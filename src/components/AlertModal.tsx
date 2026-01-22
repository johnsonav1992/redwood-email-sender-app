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
      <div
        className="absolute inset-0 bg-black/50"
        onClick={onClose}
      />
      <div className={cn(
        'relative bg-white rounded-lg shadow-xl p-6 max-w-sm w-full mx-4 border-2',
        color.border
      )}>
        <div className={cn('rounded-lg p-4 mb-4', color.bg)}>
          <h3 className={cn('text-lg font-semibold mb-2', color.title)}>
            {title}
          </h3>
          <p className="text-gray-700">
            {message}
          </p>
        </div>
        <div className="flex justify-end gap-3">
          {onConfirm ? (
            <>
              <button
                onClick={onClose}
                className="px-6 py-2 text-sm font-medium text-gray-700 bg-gray-100 hover:bg-gray-200 rounded transition cursor-pointer"
              >
                {cancelLabel}
              </button>
              <button
                onClick={onConfirm}
                className={cn(
                  'px-6 py-2 text-sm font-medium text-white rounded transition cursor-pointer',
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
                'px-6 py-2 text-sm font-medium text-white rounded transition cursor-pointer',
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
