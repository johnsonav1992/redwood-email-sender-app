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
  ImageWithStyles
} from '@/lib/editor-extensions';

interface RichTextEditorProps {
  value: string;
  onChange: (html: string) => void;
  disabled?: boolean;
  placeholder?: string;
  minHeight?: number;
}

export default function RichTextEditor({
  value,
  onChange,
  disabled = false,
  placeholder = 'Write your email content...',
  minHeight = 200
}: RichTextEditorProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [selectedImage, setSelectedImage] = useState<HTMLImageElement | null>(
    null
  );
  const [overlayPosition, setOverlayPosition] = useState<{
    left: number;
    top: number;
    width: number;
    height: number;
  } | null>(null);
  const [prevSelectedImage, setPrevSelectedImage] = useState<HTMLImageElement | null>(null);
  const resizeStartRef = useRef<{
    width: number;
    height: number;
    x: number;
    y: number;
  } | null>(null);

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
      ImageWithStyles.configure({
        inline: true,
        allowBase64: true
      }),
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

  const computeOverlayPosition = useCallback((img: HTMLImageElement) => {
    const rect = img.getBoundingClientRect();
    return {
      left: rect.left - 4,
      top: rect.top - 4,
      width: img.offsetWidth + 8,
      height: img.offsetHeight + 8
    };
  }, []);

  if (selectedImage !== prevSelectedImage) {
    setPrevSelectedImage(selectedImage);
    if (selectedImage) {
      const newPos = computeOverlayPosition(selectedImage);
      setOverlayPosition(newPos);
    } else {
      setOverlayPosition(null);
    }
  }

  useEffect(() => {
    if (!selectedImage) return;

    const handlePositionUpdate = () => {
      setOverlayPosition(computeOverlayPosition(selectedImage));
    };

    window.addEventListener('scroll', handlePositionUpdate, true);
    window.addEventListener('resize', handlePositionUpdate);
    return () => {
      window.removeEventListener('scroll', handlePositionUpdate, true);
      window.removeEventListener('resize', handlePositionUpdate);
    };
  }, [selectedImage, computeOverlayPosition]);

  useEffect(() => {
    const editorElement = document.querySelector('.ProseMirror');
    if (!editorElement) return;

    const handleImageClick = (e: Event) => {
      const target = e.target as HTMLElement;
      if (target.tagName === 'IMG') {
        e.preventDefault();
        setSelectedImage(target as HTMLImageElement);
      } else if (!target.closest('.image-resize-handle')) {
        setSelectedImage(null);
      }
    };

    editorElement.addEventListener('click', handleImageClick);
    return () => editorElement.removeEventListener('click', handleImageClick);
  }, [editor]);

  const handleResizeStart = (e: React.MouseEvent, corner: string) => {
    if (!selectedImage) return;
    e.preventDefault();
    e.stopPropagation();

    resizeStartRef.current = {
      width: selectedImage.offsetWidth,
      height: selectedImage.offsetHeight,
      x: e.clientX,
      y: e.clientY
    };

    const handleMouseMove = (moveEvent: MouseEvent) => {
      if (!resizeStartRef.current || !selectedImage) return;

      const deltaX = moveEvent.clientX - resizeStartRef.current.x;
      const deltaY = moveEvent.clientY - resizeStartRef.current.y;

      let newWidth = resizeStartRef.current.width;
      let newHeight = resizeStartRef.current.height;

      if (corner.includes('e'))
        newWidth = Math.max(50, resizeStartRef.current.width + deltaX);
      if (corner.includes('w'))
        newWidth = Math.max(50, resizeStartRef.current.width - deltaX);
      if (corner.includes('s'))
        newHeight = Math.max(50, resizeStartRef.current.height + deltaY);
      if (corner.includes('n'))
        newHeight = Math.max(50, resizeStartRef.current.height - deltaY);

      if (moveEvent.shiftKey) {
        const aspectRatio =
          resizeStartRef.current.width / resizeStartRef.current.height;
        if (Math.abs(deltaX) > Math.abs(deltaY)) {
          newHeight = newWidth / aspectRatio;
        } else {
          newWidth = newHeight * aspectRatio;
        }
      }

      selectedImage.style.width = `${newWidth}px`;
      selectedImage.style.height = `${newHeight}px`;

      setOverlayPosition({
        left: selectedImage.getBoundingClientRect().left - 4,
        top: selectedImage.getBoundingClientRect().top - 4,
        width: newWidth + 8,
        height: newHeight + 8
      });
    };

    const handleMouseUp = () => {
      resizeStartRef.current = null;

      if (selectedImage && editor) {
        const newWidth = selectedImage.style.width;
        const newHeight = selectedImage.style.height;
        selectedImage.setAttribute('width', newWidth);
        selectedImage.setAttribute('height', newHeight);
        onChange(editor.getHTML());
      }

      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };

    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);
  };

  if (!editor) {
    return null;
  }

  return (
    <div className="relative">
      <div
        className={cn(
          'overflow-hidden rounded-lg border-2 transition',
          disabled
            ? 'border-gray-200 bg-gray-50'
            : 'border-gray-200 focus-within:border-blue-500'
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
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M10 4h4m-2 0v16m-4 0h8"
                transform="skewX(-10)"
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
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M17 12H7m10 0a4 4 0 10-4-4m4 4a4 4 0 01-4 4"
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
        </div>

        <div className="relative">
          <EditorContent editor={editor} />
          {!editor.getText() && !disabled && (
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

      {selectedImage && !disabled && overlayPosition && (
        <div
          className="pointer-events-none fixed"
          style={{
            left: overlayPosition.left,
            top: overlayPosition.top,
            width: overlayPosition.width,
            height: overlayPosition.height
          }}
        >
          <div className="pointer-events-none absolute inset-0 border-2 border-blue-500" />
          {(['nw', 'ne', 'sw', 'se'] as const).map(corner => (
            <div
              key={corner}
              className={cn(
                'image-resize-handle pointer-events-auto absolute h-3 w-3 cursor-pointer rounded-sm border border-white bg-blue-500',
                corner === 'nw' &&
                  'top-0 left-0 -translate-x-1/2 -translate-y-1/2 cursor-nw-resize',
                corner === 'ne' &&
                  'top-0 right-0 translate-x-1/2 -translate-y-1/2 cursor-ne-resize',
                corner === 'sw' &&
                  'bottom-0 left-0 -translate-x-1/2 translate-y-1/2 cursor-sw-resize',
                corner === 'se' &&
                  'right-0 bottom-0 translate-x-1/2 translate-y-1/2 cursor-se-resize'
              )}
              onMouseDown={e => handleResizeStart(e, corner)}
            />
          ))}
        </div>
      )}

      <p className="mt-1.5 text-xs text-gray-500">
        Drag & drop or paste images. Click an image to resize it. Hold Shift to
        maintain aspect ratio.
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
          cursor: pointer;
          display: inline !important;
          vertical-align: middle;
        }
        .ProseMirror img.ProseMirror-selectednode {
          outline: 2px solid #3b82f6;
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
