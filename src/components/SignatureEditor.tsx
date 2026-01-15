'use client';

import { useState, useRef } from 'react';
import { cn } from '@/lib/utils';

interface SignatureEditorProps {
  signature: string;
  onSignatureChange: (signature: string) => void;
  disabled?: boolean;
}

export default function SignatureEditor({
  signature,
  onSignatureChange,
  disabled,
}: SignatureEditorProps) {
  const [showPreview, setShowPreview] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      alert('Please select an image file');
      return;
    }

    if (file.size > 500 * 1024) {
      alert('Image must be less than 500KB');
      return;
    }

    const reader = new FileReader();
    reader.onload = (event) => {
      const dataUrl = event.target?.result as string;
      const imgTag = `<img src="${dataUrl}" alt="Signature image" style="max-width: 200px; height: auto;" />`;
      onSignatureChange(signature + imgTag);
    };
    reader.readAsDataURL(file);

    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <label className="block text-sm font-medium text-gray-700">
          Email Signature (HTML)
        </label>
        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            disabled={disabled}
            className={cn(
              'text-xs px-2 py-1 rounded border transition-colors',
              disabled
                ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                : 'border-gray-300 text-gray-600 hover:bg-gray-50'
            )}
          >
            Add Image
          </button>
          <button
            type="button"
            onClick={() => setShowPreview(!showPreview)}
            className="text-xs px-2 py-1 rounded border border-gray-300 text-gray-600 hover:bg-gray-50"
          >
            {showPreview ? 'Edit' : 'Preview'}
          </button>
        </div>
      </div>

      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={handleImageUpload}
        disabled={disabled}
      />

      {showPreview ? (
        <div
          className="w-full min-h-[100px] p-3 border rounded-lg bg-white"
          dangerouslySetInnerHTML={{ __html: signature || '<em class="text-gray-400">No signature</em>' }}
        />
      ) : (
        <textarea
          value={signature}
          onChange={(e) => onSignatureChange(e.target.value)}
          disabled={disabled}
          placeholder="<div style='border-top: 1px solid #ccc; padding-top: 10px; margin-top: 20px;'>&#10;  <p>Best regards,</p>&#10;  <p><strong>Your Name</strong></p>&#10;</div>"
          className={cn(
            'w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 font-mono text-sm',
            disabled && 'bg-gray-100 text-gray-500'
          )}
          rows={4}
        />
      )}

      <p className="text-xs text-gray-500">
        Use HTML for formatting. Images will be embedded inline (base64).
      </p>
    </div>
  );
}
