/* eslint-disable react/no-unknown-property */
'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import {
  TextStyle,
  Color,
  FontFamily,
  FontSize,
  LineHeight,
  BackgroundColor
} from '@tiptap/extension-text-style';
import Underline from '@tiptap/extension-underline';
import TextAlign from '@tiptap/extension-text-align';
import Gapcursor from '@tiptap/extension-gapcursor';
import { cn, fileToBase64 } from '@/lib/utils';
import {
  SpanMark,
  ParagraphWithStyles,
  DivNode,
  TableCellWithStyles,
  TableHeaderWithStyles,
  TableRowWithStyles,
  TableWithStyles,
  LinkWithStyles,
  ImageWithStyles,
  ImageWithResize
} from '@/lib/editor-extensions';

interface RichTextEditorProps {
  value: string;
  onChange: (html: string) => void;
  disabled?: boolean;
  placeholder?: string;
  minHeight?: number;
  enableImageResize?: boolean;
}

export default function RichTextEditor({
  value,
  onChange,
  disabled = false,
  placeholder = 'Write your email content...',
  minHeight = 200,
  enableImageResize = false
}: RichTextEditorProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isImageSelected, setIsImageSelected] = useState(false);

  const handleImageFile = useCallback(
    async (file: File, editorInstance: ReturnType<typeof useEditor> | null) => {
      if (!editorInstance) return;
      if (file.size > 5 * 1024 * 1024) {
        alert('Image must be less than 5MB');
        return;
      }
      const base64 = await fileToBase64(file);
      editorInstance.chain().focus().setImage({ src: base64 }).run();
    },
    []
  );

  const editor = useEditor({
    immediatelyRender: false,
    extensions: [
      StarterKit.configure({
        paragraph: false,
        hardBreak: { keepMarks: true },
        gapcursor: false
      }),
      Gapcursor,
      ParagraphWithStyles,
      enableImageResize
        ? ImageWithResize
        : ImageWithStyles.configure({ inline: true, allowBase64: true }),
      TextStyle,
      Color,
      FontFamily,
      FontSize,
      LineHeight,
      BackgroundColor,
      Underline,
      LinkWithStyles.configure({
        openOnClick: false,
        HTMLAttributes: {
          target: '_blank',
          rel: 'noopener noreferrer'
        }
      }),
      TextAlign.configure({
        types: ['heading', 'paragraph']
      }),
      TableWithStyles.configure({
        resizable: false
      }),
      TableRowWithStyles,
      TableCellWithStyles,
      TableHeaderWithStyles,
      SpanMark,
      DivNode
    ],
    content: value,
    editable: !disabled,
    onUpdate: ({ editor: ed }) => {
      onChange(ed.getHTML());
    },
    editorProps: {
      attributes: {
        class: 'max-w-none focus:outline-none px-4 py-3 text-sm',
        style: `min-height: ${minHeight}px`
      },
      handleDrop: (view, event, slice, moved) => {
        if (!moved && event.dataTransfer?.files?.length) {
          const file = event.dataTransfer.files[0];
          if (file.type.startsWith('image/')) {
            event.preventDefault();
            handleImageFile(file, editor);
            return true;
          }
        }
        return false;
      },
      handlePaste: (view, event) => {
        const items = event.clipboardData?.items;
        if (items) {
          for (const item of items) {
            if (item.type.startsWith('image/')) {
              event.preventDefault();
              const file = item.getAsFile();
              if (file) {
                handleImageFile(file, editor);
                return true;
              }
            }
          }
        }
        return false;
      },
      transformPastedHTML(html) {
        const parser = new DOMParser();
        const doc = parser.parseFromString(html, 'text/html');

        doc.querySelectorAll('p').forEach(p => {
          const imgs = p.querySelectorAll('img');
          imgs.forEach(img => {
            img.style.display = 'inline';
            img.style.verticalAlign = 'middle';
          });
        });

        doc.querySelectorAll('table').forEach(table => {
          const width = table.getAttribute('width');
          if (width) {
            table.style.width = width + (width.includes('%') ? '' : 'px');
            table.style.maxWidth = '100%';
          }
        });

        doc.querySelectorAll('td, th').forEach(cell => {
          const width = cell.getAttribute('width');
          if (width) {
            (cell as HTMLElement).style.width =
              width + (width.includes('%') ? '' : 'px');
          }
        });

        return doc.body.innerHTML;
      }
    },
    parseOptions: {
      preserveWhitespace: 'full'
    }
  });

  const handleAddImageClick = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file && file.type.startsWith('image/')) {
      await handleImageFile(file, editor);
    }
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleImageLink = useCallback(() => {
    if (!editor) return;

    const { href } = editor.getAttributes('image');
    const url = window.prompt(
      'Enter image link URL (leave empty to remove):',
      href || ''
    );

    if (url === null) return;

    if (url === '') {
      editor
        .chain()
        .focus()
        .updateAttributes('image', { href: null, target: null })
        .run();
    } else {
      editor
        .chain()
        .focus()
        .updateAttributes('image', { href: url, target: '_blank' })
        .run();
    }
  }, [editor]);

  useEffect(() => {
    if (editor && value !== editor.getHTML()) {
      editor.commands.setContent(value);
    }
  }, [value, editor]);

  useEffect(() => {
    if (editor) {
      editor.setEditable(!disabled);
    }
  }, [disabled, editor]);

  useEffect(() => {
    if (!editor) return;

    const updateImageSelection = () => {
      setIsImageSelected(editor.isActive('image'));
    };

    editor.on('selectionUpdate', updateImageSelection);
    editor.on('transaction', updateImageSelection);

    return () => {
      editor.off('selectionUpdate', updateImageSelection);
      editor.off('transaction', updateImageSelection);
    };
  }, [editor]);

  if (!editor) {
    return null;
  }

  return (
    <div className="rich-text-editor-with-resize relative">
      <div
        className={cn(
          'overflow-hidden rounded-lg border-2 transition',
          disabled
            ? 'border-gray-200 bg-gray-50'
            : 'border-gray-200 focus-within:border-slate-400'
        )}
      >
        <div
          className={cn(
            'flex items-center gap-1 border-b border-gray-200 bg-gray-50 px-2 py-1.5',
            disabled && 'opacity-50'
          )}
        >
          <button
            type="button"
            onClick={() => editor.chain().focus().toggleBold().run()}
            disabled={disabled}
            className={cn(
              'cursor-pointer rounded p-1.5 transition-colors hover:bg-gray-200',
              editor.isActive('bold') && 'bg-gray-200'
            )}
            title="Bold (Ctrl+B)"
          >
            <svg
              className="h-4 w-4"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2.5}
                d="M6 4h8a4 4 0 014 4 4 4 0 01-4 4H6z"
              />
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2.5}
                d="M6 12h9a4 4 0 014 4 4 4 0 01-4 4H6z"
              />
            </svg>
          </button>
          <button
            type="button"
            onClick={() => editor.chain().focus().toggleItalic().run()}
            disabled={disabled}
            className={cn(
              'cursor-pointer rounded p-1.5 transition-colors hover:bg-gray-200',
              editor.isActive('italic') && 'bg-gray-200'
            )}
            title="Italic (Ctrl+I)"
          >
            <svg
              className="h-4 w-4"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <line
                x1="19"
                y1="4"
                x2="10"
                y2="4"
                strokeWidth={2}
                strokeLinecap="round"
              />
              <line
                x1="14"
                y1="20"
                x2="5"
                y2="20"
                strokeWidth={2}
                strokeLinecap="round"
              />
              <line
                x1="15"
                y1="4"
                x2="9"
                y2="20"
                strokeWidth={2}
                strokeLinecap="round"
              />
            </svg>
          </button>
          <button
            type="button"
            onClick={() => editor.chain().focus().toggleStrike().run()}
            disabled={disabled}
            className={cn(
              'cursor-pointer rounded p-1.5 transition-colors hover:bg-gray-200',
              editor.isActive('strike') && 'bg-gray-200'
            )}
            title="Strikethrough"
          >
            <svg
              className="h-4 w-4"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M16 8c0-2.2-1.8-4-4-4s-4 1.8-4 4c0 1.5.8 2.8 2 3.5"
              />
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M8 16c0 2.2 1.8 4 4 4s4-1.8 4-4c0-1.5-.8-2.8-2-3.5"
              />
              <line
                x1="4"
                y1="12"
                x2="20"
                y2="12"
                strokeWidth={2}
                strokeLinecap="round"
              />
            </svg>
          </button>
          <div className="mx-1 h-5 w-px bg-gray-300" />
          <button
            type="button"
            onClick={() => editor.chain().focus().toggleBulletList().run()}
            disabled={disabled}
            className={cn(
              'cursor-pointer rounded p-1.5 transition-colors hover:bg-gray-200',
              editor.isActive('bulletList') && 'bg-gray-200'
            )}
            title="Bullet List"
          >
            <svg
              className="h-4 w-4"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M4 6h.01M8 6h12M4 12h.01M8 12h12M4 18h.01M8 18h12"
              />
            </svg>
          </button>
          <button
            type="button"
            onClick={() => editor.chain().focus().toggleOrderedList().run()}
            disabled={disabled}
            className={cn(
              'cursor-pointer rounded p-1.5 transition-colors hover:bg-gray-200',
              editor.isActive('orderedList') && 'bg-gray-200'
            )}
            title="Numbered List"
          >
            <svg
              className="h-4 w-4"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M4 6h.01M8 6h12M4 12h.01M8 12h12M4 18h.01M8 18h12"
              />
              <text x="2" y="8" fontSize="6" fill="currentColor">
                1
              </text>
              <text x="2" y="14" fontSize="6" fill="currentColor">
                2
              </text>
              <text x="2" y="20" fontSize="6" fill="currentColor">
                3
              </text>
            </svg>
          </button>
          <div className="mx-1 h-5 w-px bg-gray-300" />
          <button
            type="button"
            onClick={handleAddImageClick}
            disabled={disabled}
            className="flex cursor-pointer items-center gap-1 rounded p-1.5 text-sm transition-colors hover:bg-gray-200"
            title="Add Image"
          >
            <svg
              className="h-4 w-4"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"
              />
            </svg>
            <span className="text-xs">Image</span>
          </button>
          {isImageSelected && (
            <button
              type="button"
              onClick={handleImageLink}
              disabled={disabled}
              className={cn(
                'flex cursor-pointer items-center gap-1 rounded p-1.5 text-sm transition-colors hover:bg-gray-200',
                editor.getAttributes('image').href && 'bg-blue-100'
              )}
              title={
                editor.getAttributes('image').href
                  ? 'Edit image link'
                  : 'Add link to image'
              }
            >
              <svg
                className="h-4 w-4"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1"
                />
              </svg>
              <span className="text-xs">Link</span>
            </button>
          )}
        </div>
        <div className="relative">
          <EditorContent editor={editor} />
          {editor.isEmpty && !disabled && (
            <div className="pointer-events-none absolute top-3 left-4 text-gray-400">
              {placeholder}
            </div>
          )}
        </div>
      </div>

      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={handleFileChange}
        disabled={disabled}
      />

      <p className="mt-1.5 text-xs text-gray-500">
        Drag & drop or paste images. Click an image to resize it with the corner
        handles or add a link.
      </p>

      <style jsx global>{`
        .ProseMirror p:not([style]) {
          margin: 0.5em 0;
        }
        .ProseMirror p[style] {
          margin: 0;
        }
        .ProseMirror div {
          margin: 0;
        }
        .ProseMirror img {
          max-width: 100%;
          height: auto;
          display: inline !important;
          vertical-align: middle;
        }

        /* TipTap ResizableNodeView styles - only in RichTextEditor */
        .rich-text-editor-with-resize [data-resize-container] {
          position: relative;
          display: inline-block;
        }

        .rich-text-editor-with-resize [data-resize-wrapper] {
          position: relative;
          display: inline-block;
        }

        /* Hide handles by default */
        .rich-text-editor-with-resize [data-resize-handle] {
          display: none;
          position: absolute;
          width: 12px;
          height: 12px;
          background: #3b82f6;
          border: 1px solid white;
          border-radius: 1px;
          z-index: 10;
          box-shadow: 0 1px 2px rgba(0, 0, 0, 0.2);
        }

        /* Show handles when container is hovered or has selected state */
        .rich-text-editor-with-resize
          [data-resize-container]:hover
          [data-resize-handle],
        .rich-text-editor-with-resize
          [data-resize-container].ProseMirror-selectednode
          [data-resize-handle],
        .rich-text-editor-with-resize
          [data-resize-state='resizing']
          [data-resize-handle] {
          display: block;
        }

        .rich-text-editor-with-resize [data-resize-handle='bottom-left'] {
          bottom: -6px;
          left: -6px;
          cursor: sw-resize;
        }

        .rich-text-editor-with-resize [data-resize-handle='bottom-right'] {
          bottom: -6px;
          right: -6px;
          cursor: se-resize;
        }

        .rich-text-editor-with-resize [data-resize-handle='top-left'] {
          top: -6px;
          left: -6px;
          cursor: nw-resize;
        }

        .rich-text-editor-with-resize [data-resize-handle='top-right'] {
          top: -6px;
          right: -6px;
          cursor: ne-resize;
        }

        /* Border around image when selected */
        .rich-text-editor-with-resize
          [data-resize-container]:hover
          [data-resize-wrapper],
        .rich-text-editor-with-resize
          [data-resize-container].ProseMirror-selectednode
          [data-resize-wrapper] {
          outline: 2px solid #3b82f6;
          outline-offset: -2px;
        }

        .rich-text-editor-with-resize
          [data-resize-state='resizing']
          [data-resize-wrapper] {
          outline: 2px solid #3b82f6;
          outline-offset: -2px;
        }
        .ProseMirror ul:not([style]),
        .ProseMirror ol:not([style]) {
          padding-left: 1.5em;
          margin: 0.5em 0;
        }
        .ProseMirror li:not([style]) {
          margin: 0.25em 0;
        }
        .ProseMirror a {
          color: inherit;
          text-decoration: none;
        }
        .ProseMirror table {
          border-collapse: collapse;
          width: auto;
        }
        .ProseMirror td:not([style]),
        .ProseMirror th:not([style]) {
          vertical-align: top;
        }
        .ProseMirror p {
          white-space: normal;
          word-wrap: break-word;
        }
        .ProseMirror td {
          white-space: normal;
          word-wrap: break-word;
        }
      `}</style>
    </div>
  );
}
