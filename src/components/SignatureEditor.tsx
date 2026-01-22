'use client';

import RichTextEditor from './RichTextEditor';

interface SignatureEditorProps {
  signature: string;
  onSignatureChange: (signature: string) => void;
  disabled?: boolean;
}

export default function SignatureEditor({
  signature,
  onSignatureChange,
  disabled
}: SignatureEditorProps) {
  return (
    <div className="space-y-2">
      <label className="block text-sm font-semibold text-gray-700">
        Email Signature
      </label>
      <RichTextEditor
        value={signature}
        onChange={onSignatureChange}
        disabled={disabled}
        placeholder="Add your signature..."
        minHeight={100}
      />
    </div>
  );
}
