"use client";

import React, { useState, useRef, useEffect } from 'react';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import Link from 'next/link';
import { GripVertical, Plus, Square, CheckSquare, FileText, Image as ImageIcon, Copy, Check, Pencil, Link2 } from 'lucide-react';
import { SlashMenu } from './SlashMenu';
import UrlPasteModal from './UrlPasteModal';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { vscDarkPlus } from 'react-syntax-highlighter/dist/esm/styles/prism';
import { isLikelyCode } from '@/lib/utils';
import { useNote } from '@/context/NoteContext';

interface SortableBlockProps {
  id: string;
  type: string;
  content: string;
  childTitles?: Record<string, string>;
  onChange: (id: string, newContent: string, newType?: string) => void;
  onKeyDown: (e: React.KeyboardEvent, id: string) => void;
  inputRef?: (el: HTMLDivElement | null) => void; // Changed from HTMLInputElement
  onPasteMultiLine?: (id: string, newLines: string[], isCode?: boolean) => void;
  listNumber?: number; // New prop for numbered lists
  isSelected?: boolean;
  onSelect?: (id: string, multi: boolean) => void;
  onFocus?: () => void;
  onBlur?: () => void;
}

const PREFIXES: Record<string, string> = {
  h1: '# ',
  h2: '## ',
  h3: '### ',
  bullet: '- ',
  number: '1. ',
  todo: '[] ',
  todo_checked: '[x] ', // todo_checked should not trigger auto-format on typing
  toggle: '> ',
  page: 'p: ',
  image: 'img: ',
  video: 'vid: ',
  code: '``` ',
};

export function SortableBlock({ id, type, content, childTitles = {}, onChange, onKeyDown, inputRef, onPasteMultiLine, listNumber, isSelected, onSelect, onFocus, onBlur }: SortableBlockProps) {
  const { updatedTitles } = useNote();
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id });

  const [showMenu, setShowMenu] = useState(false);
  const [showUrlModal, setShowUrlModal] = useState(false);
  const [modalPosition, setModalPosition] = useState({ top: 0, left: 0 });
  const [pastedUrl, setPastedUrl] = useState('');
  const [isPastedVideo, setIsPastedVideo] = useState(false);
  const [isInputFocused, setIsInputFocused] = useState(false);
  const [copied, setCopied] = useState(false);
  const [hoveredLink, setHoveredLink] = useState<{ el: HTMLAnchorElement; url: string; rect: DOMRect } | null>(null);
  const [editingLink, setEditingLink] = useState<HTMLAnchorElement | null>(null);
  const [editLinkValue, setEditLinkValue] = useState('');
  const [linkCopied, setLinkCopied] = useState(false);
  const localInputRef = useRef<HTMLDivElement>(null);
  const resizerRef = useRef<HTMLDivElement>(null);
  const linkPreviewRef = useRef<HTMLDivElement>(null);

  // Effect to update the contentEditable div's innerHTML when content prop changes
  useEffect(() => {
    if (localInputRef.current && localInputRef.current.innerHTML !== content && type !== 'image' && type !== 'code') {
      localInputRef.current.innerHTML = content;
    }
  }, [content, type]);

  // Link hover detection
  useEffect(() => {
    const el = localInputRef.current;
    if (!el) return;

    const handleMouseOver = (e: MouseEvent) => {
      const target = (e.target as HTMLElement).closest('a') as HTMLAnchorElement | null;
      if (target && el.contains(target)) {
        const rect = target.getBoundingClientRect();
        setHoveredLink({ el: target, url: target.href, rect });
      }
    };

    const handleMouseOut = (e: MouseEvent) => {
      const related = e.relatedTarget as HTMLElement | null;
      // Don't close if moving to the preview tooltip
      if (linkPreviewRef.current?.contains(related)) return;
      const target = (e.target as HTMLElement).closest('a');
      if (target) {
        setHoveredLink(null);
      }
    };

    el.addEventListener('mouseover', handleMouseOver);
    el.addEventListener('mouseout', handleMouseOut);
    return () => {
      el.removeEventListener('mouseover', handleMouseOver);
      el.removeEventListener('mouseout', handleMouseOut);
    };
  });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    zIndex: isDragging ? 100 : 'auto',
    position: 'relative' as 'relative',
    opacity: isDragging ? 0.5 : 1,
    backgroundColor: isSelected ? '#2383e233' : 'transparent',
  };

  const setRefs = (el: HTMLDivElement | null) => { // Changed to HTMLDivElement
    localInputRef.current = el;
    if (inputRef) inputRef(el);
  };

  const handleInput = (e: React.FormEvent<HTMLDivElement>) => {
    const textVal = (e.target as HTMLDivElement).innerText;
    const htmlVal = (e.target as HTMLDivElement).innerHTML;

    // Check for auto-formatting using textVal
    if (type === 'text' && textVal.endsWith(' ')) {
      for (const [key, prefix] of Object.entries(PREFIXES)) {
        if (key !== 'todo_checked' && textVal.startsWith(prefix)) { // Exclude todo_checked from auto-format trigger
          // Instead of clearing content, we update content to remove the prefix
          // and then trigger a type change
          onChange(id, textVal.slice(prefix.length), key);
          // Manual focus is needed after type change if content is modified
          // setTimeout(() => localInputRef.current?.focus(), 0);
          return; // Stop after first match
        }
      }
    }

    if (textVal === '/') {
      setShowMenu(true);
    } else if (showMenu && !textVal.includes('/')) {
      setShowMenu(false);
    }

    onChange(id, htmlVal);
  };

  const handleFocus = () => {
    setIsInputFocused(true);
    if (onFocus) onFocus();
  };
  const handleBlur = () => {
    setIsInputFocused(false);
    if (onBlur) onBlur();
    // When blurring, ensure content is clean (e.g., no extra newlines from contentEditable)
    if (localInputRef.current && type !== 'image' && type !== 'code') {
      onChange(id, localInputRef.current.innerHTML.trim());
    }
  };

  const handleCopy = () => {
    navigator.clipboard.writeText(content);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handlePaste = (e: React.ClipboardEvent<HTMLDivElement>) => { // Changed to HTMLDivElement
    e.preventDefault(); // Prevent default paste behavior
    const text = e.clipboardData.getData('text/plain'); // Get plain text from clipboard

    // Check if it's a URL
    const isUrl = /^(https?:\/\/[^\s]+)$/i.test(text.trim());
    const isImageUrl = /https?:\/\/[^\s]+\.(jpg|jpeg|png|gif|webp|svg)(\?[^\s]*)?/i.test(text.trim());
    const isVideoUrl = /^(https?:\/\/)?(www\.)?(youtube\.com|youtu\.be|vimeo\.com|dailymotion\.com)\/.+$/i.test(text.trim());

    if (isImageUrl || isVideoUrl || isUrl) {
      setPastedUrl(text.trim());
      setIsPastedVideo(isVideoUrl);
      const rect = localInputRef.current?.getBoundingClientRect();
      if (rect) {
        setModalPosition({
          top: rect.bottom + window.scrollY,
          left: rect.left + window.scrollX
        });
        setShowUrlModal(true);
      }
      return;
    }

    if (isLikelyCode(text) && content === '') {
      onChange(id, text, 'code');
      return;
    }

    const lines = text.split('\n');

    if (lines.length > 1 && onPasteMultiLine) {
      // If multi-line, use the multi-line handler
      onPasteMultiLine(id, lines, isLikelyCode(text));
    } else {
      // If single line, insert text at cursor position
      document.execCommand('insertText', false, text);
      // And then call onChange to update the block content
      if (localInputRef.current) {
        onChange(id, localInputRef.current.innerHTML);
      }
    }
  };

  const getEmbedUrl = (url: string) => {
    try {
      const urlObj = new URL(url.startsWith('http') ? url : `https://${url}`);

      // YouTube
      if (urlObj.hostname.includes('youtube.com')) {
        const videoId = urlObj.searchParams.get('v');
        if (videoId) return `https://www.youtube.com/embed/${videoId}`;
      }
      if (urlObj.hostname.includes('youtu.be')) {
        const videoId = urlObj.pathname.slice(1);
        if (videoId) return `https://www.youtube.com/embed/${videoId}`;
      }

      // Vimeo
      if (urlObj.hostname.includes('vimeo.com')) {
        const videoId = urlObj.pathname.split('/').pop();
        if (videoId && /^\d+$/.test(videoId)) {
          return `https://player.vimeo.com/video/${videoId}`;
        }
      }

      // Dailymotion
      if (urlObj.hostname.includes('dailymotion.com')) {
        const videoId = urlObj.pathname.split('/').pop()?.split('_')[0];
        if (videoId) return `https://www.dailymotion.com/embed/video/${videoId}`;
      }
    } catch (e) {
      console.error('Error parsing video URL:', e);
    }
    return url;
  };

  const handleModalSelect = (option: 'mention' | 'url' | 'bookmark' | 'embed') => {
    if (option === 'embed') {
      if (isPastedVideo) {
        onChange(id, `${getEmbedUrl(pastedUrl)}|100%|450px`, 'video');
      } else {
        onChange(id, `${pastedUrl}|100%|auto`, 'image');
      }
    } else {
      // For other options, we just insert the URL for now or handle accordingly
      // Notion usually creates a link or a bookmark
      if (option === 'url') {
        document.execCommand('insertText', false, pastedUrl);
        if (localInputRef.current) {
          onChange(id, localInputRef.current.innerHTML);
        }
      }
      // Other options like mention and bookmark could be implemented later
    }
    setShowUrlModal(false);
  };

  const handleMenuSelect = (newType: string) => {
    // When selecting from menu, we clear the content (remove '/') and set the new type
    onChange(id, '', newType);
    setShowMenu(false);
    // Use timeout to ensure state update before focusing
    setTimeout(() => localInputRef.current?.focus(), 10);
  };

  const getStyles = () => {
    switch (type) {
      case 'h1': return 'text-3xl font-bold';
      case 'h2': return 'text-2xl font-bold';
      case 'h3': return 'text-xl font-bold';
      case 'toggle': return 'text-base italic border-l-2 border-gray-300 dark:border-gray-600 pl-4';
      case 'todo_checked': return 'text-base line-through text-gray-400';
      default: return 'text-base';
    }
  };

  const getContainerMargins = () => {
    switch (type) {
      case 'h1': return 'mt-6 mb-2';
      case 'h2': return 'mt-5 mb-2';
      case 'h3': return 'mt-4 mb-1';
      default: return '';
    }
  };

  const getLineHeight = () => {
    switch (type) {
      case 'h1': return 'min-h-[2.25rem]'; // Use min-h for contentEditable
      case 'h2': return 'min-h-[2rem]';
      case 'h3': return 'min-h-[1.75rem]';
      default: return 'min-h-[1.5rem]';
    }
  };

  const isTodo = type === 'todo' || type === 'todo_checked';
  const isChecked = type === 'todo_checked';

  const toggleTodo = () => {
    onChange(id, content, isChecked ? 'todo' : 'todo_checked');
  };

  const lineHeight = getLineHeight();

  const isVisuallyCollapsed = content === '' && !isInputFocused && type === 'text';

  const currentPlaceholder = (isInputFocused && content === '' && type === 'text') ? "Digite '/' para comandos" : "";

  const isContentEmptyAndUnfocused = content === '' && !isInputFocused && type === 'text';

  // For image resizing
  const handleResize = (e: React.MouseEvent, direction: 'horizontal' | 'vertical' | 'both') => {
    e.preventDefault();
    e.stopPropagation();
    const startX = e.clientX;
    const startY = e.clientY;

    const element = resizerRef.current?.parentElement;
    if (!element) return;

    const rect = element.getBoundingClientRect();
    const startWidth = rect.width;
    const startHeight = rect.height;
    const containerWidth = element.parentElement?.getBoundingClientRect().width || 1;

    const [imgUrl, currentWidth = '100%', currentHeight = 'auto'] = content.split('|');

    const onMouseMove = (moveEvent: MouseEvent) => {
      let newWidthPercent = currentWidth;
      let newHeight = currentHeight;

      if (direction === 'horizontal' || direction === 'both') {
        const deltaX = moveEvent.clientX - startX;
        // Symmetric resize because it's centered
        const calculatedWidth = Math.max(100, startWidth + deltaX * 2);
        const widthPercent = Math.min(100, (calculatedWidth / containerWidth) * 100);
        newWidthPercent = `${widthPercent}%`;
      }

      if (direction === 'vertical' || direction === 'both') {
        const deltaY = moveEvent.clientY - startY;
        const calculatedHeight = Math.max(50, startHeight + deltaY);
        newHeight = `${calculatedHeight}px`;
      }

      onChange(id, `${imgUrl}|${newWidthPercent}|${newHeight}`, type);
    };

    const onMouseUp = () => {
      document.removeEventListener('mousemove', onMouseMove);
      document.removeEventListener('mouseup', onMouseUp);
    };

    document.addEventListener('mousemove', onMouseMove);
    document.addEventListener('mouseup', onMouseUp);
  };

  if (type === 'code') {
    return (
      <div
        ref={setNodeRef}
        data-block-id={id}
        style={style}
        onClick={(e) => {
          if (e.shiftKey && onSelect) {
            e.preventDefault();
            onSelect(id, true);
          } else if (onSelect) {
            onSelect(id, false);
          }
        }}
        className={`group/block flex items-start -ml-12 pl-2 py-1 relative rounded transition-colors my-2 ${isSelected ? 'bg-[#2383e233]' : ''}`}
      >
        <div className={`absolute left-0 top-1 flex items-center gap-1 opacity-0 group-hover/block:opacity-100 transition-opacity px-1 select-none z-10 h-8`}>
          <button tabIndex={-1} className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 cursor-pointer">
            <Plus size={16} />
          </button>
          <button
            className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 cursor-grab active:cursor-grabbing"
            {...attributes}
            {...listeners}
          >
            <GripVertical size={16} />
          </button>
        </div>

        <div className="flex-1 ml-10 relative group/code overflow-hidden rounded-md bg-[#202020] border border-[#333]">
          {/* Language badge or selector could go here */}
          <div className="absolute right-2 top-2 z-20 opacity-0 group-hover/code:opacity-100 transition-opacity flex items-center gap-2">
            <span className="text-[10px] text-gray-500 font-mono uppercase bg-[#2a2a2a] px-1.5 py-0.5 rounded border border-[#444]">
              JS
            </span>
            <button
              onClick={handleCopy}
              className="p-1.5 rounded bg-[#2a2a2a] hover:bg-[#333] text-gray-400 hover:text-white transition-colors border border-[#444]"
              title="Copiar código"
            >
              {copied ? <Check size={14} className="text-green-500" /> : <Copy size={14} />}
            </button>
          </div>

          <div className="relative">
            {isInputFocused ? (
              <textarea
                id={`textarea-${id}`}
                autoFocus
                value={content}
                onChange={(e) => {
                  onChange(id, e.target.value);
                  // Auto-resize
                  e.target.style.height = 'auto';
                  e.target.style.height = e.target.scrollHeight + 'px';
                }}
                onKeyDown={(e) => {
                  if (e.key === 'Tab') {
                    e.preventDefault();
                    const start = e.currentTarget.selectionStart;
                    const end = e.currentTarget.selectionEnd;
                    const newValue = content.substring(0, start) + "  " + content.substring(end);
                    onChange(id, newValue);
                    // Reset cursor position after state update
                    setTimeout(() => {
                      const textarea = document.getElementById(`textarea-${id}`) as HTMLTextAreaElement;
                      if (textarea) {
                        textarea.selectionStart = textarea.selectionEnd = start + 2;
                      }
                    }, 0);
                  } else if (e.key === 'Enter') {
                    // Let the textarea handle Enter (newline)
                    // and stop propagation to prevent page.tsx from creating a new block
                    e.stopPropagation();
                  } else if (e.key === 'Backspace' && content === '') {
                    // If empty, let the parent handle backspace to delete the block
                    onKeyDown(e, id);
                  } else if (e.key === 'ArrowUp' || e.key === 'ArrowDown') {
                    // Only pass arrows to parent if we're at the very start/end
                    const { selectionStart, selectionEnd, value } = e.currentTarget;
                    const lines = value.split('\n');
                    const isAtFirstLine = selectionStart <= lines[0].length;
                    const isAtLastLine = selectionStart > value.length - (lines[lines.length - 1].length + 1);

                    if ((e.key === 'ArrowUp' && isAtFirstLine) || (e.key === 'ArrowDown' && isAtLastLine)) {
                      onKeyDown(e, id);
                    }
                  } else {
                    // For other keys, just let the textarea handle them or stop propagation
                    // to prevent global shortcuts if any
                    e.stopPropagation();
                  }
                }}
                onFocus={handleFocus}
                onBlur={handleBlur}
                className="w-full bg-transparent text-gray-300 font-mono text-sm p-4 outline-none border-none resize-none min-h-[100px] block"
                spellCheck={false}
                style={{ height: content.split('\n').length * 20 + 32 + 'px' }}
              />
            ) : (
              <div
                onClick={() => {
                  setIsInputFocused(true);
                }}
                className="cursor-text"
              >
                <SyntaxHighlighter
                  language="javascript"
                  style={vscDarkPlus}
                  customStyle={{
                    margin: 0,
                    padding: '1rem',
                    fontSize: '0.875rem',
                    lineHeight: '1.25rem',
                    background: 'transparent',
                    minHeight: '100px',
                  }}
                  codeTagProps={{
                    style: {
                      fontFamily: 'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", "Courier New", monospace',
                    }
                  }}
                >
                  {content || '// Clique para editar...'}
                </SyntaxHighlighter>
              </div>
            )}
          </div>
        </div>
      </div>
    );
  }

  if (type === 'page') {
    const [pageId, ...titleParts] = content.split('|');
    const storedTitle = titleParts.join('|');
    const liveTitle = updatedTitles[pageId] || childTitles[pageId] || storedTitle || "Nova página";

    return (
      <div
        ref={setNodeRef}
        data-block-id={id}
        style={style}
        className={`group flex items-start -ml-12 pl-2 py-1 relative rounded transition-colors ${getContainerMargins()}`}
      >
        <div className={`absolute left-0 top-1 flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity px-1 select-none z-10 ${lineHeight}`}>
          <button tabIndex={-1} className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 cursor-pointer">
            <Plus size={16} />
          </button>
          <button
            className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 cursor-grab active:cursor-grabbing"
            {...attributes}
            {...listeners}
          >
            <GripVertical size={16} />
          </button>
        </div>
        <div className="flex-1 ml-10">
          <Link
            href={`/${pageId}`}
            className="flex items-center gap-2 w-full p-1 hover:bg-[#2f2f2f] rounded transition-colors group/link no-underline text-white"
          >
            <FileText size={20} className="text-[#9b9b9b] group-hover/link:text-white shrink-0" />
            <span className="text-base text-white font-medium truncate underline-offset-4 group-hover/link:underline">
              {liveTitle}
            </span>
          </Link>
        </div>
      </div>
    );
  }

  if (type === 'image' || type === 'video') {
    const [url, width = '100%', height = 'auto'] = content.split('|');
    return (
      <div
        ref={setNodeRef}
        data-block-id={id}
        style={style}
        onClick={(e) => {
          if (e.shiftKey && onSelect) {
            e.preventDefault();
            onSelect(id, true);
          } else if (onSelect) {
            onSelect(id, false);
          }
        }}
        className={`group flex items-start -ml-12 pl-2 py-1 relative rounded transition-colors my-4 ${isSelected ? 'bg-[#2383e233]' : ''}`}
      >
        <div className={`absolute left-0 top-1 flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity px-1 select-none z-10 h-8`}>
          <button tabIndex={-1} className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 cursor-pointer">
            <Plus size={16} />
          </button>
          <button
            className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 cursor-grab active:cursor-grabbing"
            {...attributes}
            {...listeners}
          >
            <GripVertical size={16} />
          </button>
        </div>
        <div className="flex-1 ml-10 flex flex-col items-center group/image relative">
          <div
            ref={resizerRef}
            className="relative"
            style={{ width: width, height: height }}
          >
            {type === 'image' ? (
              <img
                src={url}
                alt="Embedded content"
                className={`w-full h-full rounded-sm select-none object-cover ${isSelected ? 'ring-2 ring-[#2383e2]' : ''}`}
                draggable={false}
              />
            ) : (
              <iframe
                src={url}
                className={`w-full h-full rounded-sm select-none ${isSelected ? 'ring-2 ring-[#2383e2]' : ''}`}
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                allowFullScreen
              />
            )}

            {/* Horizontal Resizers (Width) */}
            <div
              onMouseDown={(e) => handleResize(e, 'horizontal')}
              className="absolute top-0 -right-1.5 w-1.5 h-full hover:bg-[#2383e2] cursor-ew-resize opacity-0 group-hover/image:opacity-100 transition-all"
            />
            <div
              onMouseDown={(e) => handleResize(e, 'horizontal')}
              className="absolute top-0 -left-1.5 w-1.5 h-full hover:bg-[#2383e2] cursor-ew-resize opacity-0 group-hover/image:opacity-100 transition-all"
            />

            {/* Vertical Resizer (Height) */}
            <div
              onMouseDown={(e) => handleResize(e, 'vertical')}
              className="absolute -bottom-1.5 left-0 w-full h-1.5 hover:bg-[#2383e2] cursor-ns-resize opacity-0 group-hover/image:opacity-100 transition-all"
            />

            {/* Corner Resizer (Both) */}
            <div
              onMouseDown={(e) => handleResize(e, 'both')}
              className="absolute -bottom-1.5 -right-1.5 w-4 h-4 hover:bg-[#2383e2] cursor-nwse-resize opacity-0 group-hover/image:opacity-100 transition-all z-20 rounded-full border-2 border-white dark:border-[#191919]"
            />
          </div>
        </div>
      </div>
    );
  }

  return (
    <div
      ref={setNodeRef}
      data-block-id={id}
      style={style}
      onClick={(e) => {
        if (e.shiftKey && onSelect) {
          e.preventDefault();
          onSelect(id, true);
        } else if (onSelect && (e.target as HTMLElement).classList.contains('group')) {
          onSelect(id, false);
        }
      }}
      className={`group flex items-start -ml-12 pl-2 py-1 relative rounded transition-colors ${getContainerMargins()}`}
    >
      {/* Drag Handle & Add Button Container */}
      <div className={`absolute left-0 top-1 flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity px-1 select-none z-10 ${lineHeight}`}>
        <button tabIndex={-1} className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 cursor-pointer">
          <Plus size={18} />
        </button>
        <button
          className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 cursor-grab active:cursor-grabbing"
          {...attributes}
          {...listeners}
        >
          <GripVertical size={18} />
        </button>
      </div>

      {/* Prefix Indicators */}
      <div className={`flex items-center ml-10 shrink-0 select-none ${lineHeight}`}>
        {isTodo && (
          <button
            onClick={toggleTodo}
            className="mr-2 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
          >
            {isChecked ? <CheckSquare size={16} /> : <Square size={16} />}
          </button>
        )}
        {type === 'bullet' && <span className="mr-3 text-gray-500">•</span>}
        {type === 'number' && <span className="mr-2 text-gray-500">{listNumber}.</span>}
      </div>

      {/* Content Editable Div */}
      <div className="flex-1 relative">
        <div
          ref={setRefs}
          id={id}
          contentEditable="true"
          tabIndex={0}
          className={`w-full bg-transparent border-none outline-none text-gray-800 dark:text-gray-300 resize-none focus:outline-none touch-auto select-text ${getStyles()} ${isContentEmptyAndUnfocused ? 'py-0' : ''}`}
          onInput={handleInput}
          onKeyDown={(e) => {
            if (e.key === 'Tab') {
              e.preventDefault();
              document.execCommand('insertHTML', false, '&nbsp;&nbsp;');
              if (localInputRef.current) {
                onChange(id, localInputRef.current.innerHTML);
              }
              return;
            }
            onKeyDown(e, id);
          }}
          onClick={(e) => {
            const target = (e.target as HTMLElement).closest('a') as HTMLAnchorElement | null;
            if (target) {
              e.preventDefault();
              const url = target.getAttribute('href');
              if (url) {
                if (url.startsWith('/')) {
                  window.location.href = url;
                } else {
                  window.open(url, '_blank', 'noopener,noreferrer');
                }
              }
            }
          }}
          onPaste={handlePaste}
          onFocus={handleFocus}
          onBlur={handleBlur}
          data-placeholder={currentPlaceholder}
          style={{
            WebkitUserSelect: 'text',
            userSelect: 'text',
            WebkitTouchCallout: 'default'
          }}
          suppressContentEditableWarning={true} // To suppress React warning
        />

        {/* Link Hover Preview */}
        {hoveredLink && !editingLink && (
          <div
            ref={linkPreviewRef}
            className="fixed z-[100] flex items-center gap-1.5 px-2.5 py-1.5 bg-[#252525] border border-[#3a3a3a] rounded-lg shadow-2xl text-sm animate-in fade-in duration-100"
            style={{
              top: hoveredLink.rect.bottom + 6,
              left: hoveredLink.rect.left,
            }}
            onMouseLeave={() => setHoveredLink(null)}
          >
            <Link2 size={13} className="text-gray-500 shrink-0" />
            <a
              href={hoveredLink.url}
              target="_blank"
              rel="noopener noreferrer"
              className="text-[#2383e2] text-xs max-w-[200px] truncate hover:underline"
            >
              {hoveredLink.url}
            </a>
            <div className="w-px h-3.5 bg-[#3a3a3a] mx-0.5" />
            <button
              onClick={() => {
                navigator.clipboard.writeText(hoveredLink.url);
                setLinkCopied(true);
                setTimeout(() => setLinkCopied(false), 1500);
              }}
              className="p-0.5 rounded hover:bg-[#3a3a3a] text-gray-400 hover:text-white transition-colors"
              title="Copiar link"
            >
              {linkCopied ? <Check size={13} className="text-green-500" /> : <Copy size={13} />}
            </button>
            <button
              onClick={() => {
                setEditingLink(hoveredLink.el);
                setEditLinkValue(hoveredLink.url);
                setHoveredLink(null);
              }}
              className="p-0.5 rounded hover:bg-[#3a3a3a] text-gray-400 hover:text-white transition-colors"
              title="Editar link"
            >
              <Pencil size={13} />
            </button>
          </div>
        )}

        {/* Link Edit Inline */}
        {editingLink && (
          <div
            className="fixed z-[100] flex items-center gap-1.5 px-2.5 py-1.5 bg-[#252525] border border-[#3a3a3a] rounded-lg shadow-2xl text-sm animate-in fade-in duration-100"
            style={{
              top: editingLink.getBoundingClientRect().bottom + 6,
              left: editingLink.getBoundingClientRect().left,
            }}
          >
            <Link2 size={13} className="text-gray-500 shrink-0" />
            <input
              autoFocus
              value={editLinkValue}
              onChange={(e) => setEditLinkValue(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault();
                  editingLink.href = editLinkValue;
                  setEditingLink(null);
                  // Trigger save
                  if (localInputRef.current) {
                    onChange(id, localInputRef.current.innerHTML);
                  }
                } else if (e.key === 'Escape') {
                  setEditingLink(null);
                }
              }}
              onBlur={() => {
                editingLink.href = editLinkValue;
                setEditingLink(null);
                if (localInputRef.current) {
                  onChange(id, localInputRef.current.innerHTML);
                }
              }}
              className="w-52 bg-transparent text-xs text-[#2383e2] outline-none"
              placeholder="https://..."
            />
          </div>
        )}

        {/* Slash Menu */}
        {showMenu && (
          <SlashMenu
            position={{ top: type.startsWith('h') ? 40 : 32, left: 0 }}
            onSelect={handleMenuSelect}
            onClose={() => {
              setShowMenu(false);
              localInputRef.current?.focus();
            }}
          />
        )}

        {/* URL Paste Modal */}
        {showUrlModal && (
          <UrlPasteModal
            position={modalPosition}
            onClose={() => setShowUrlModal(false)}
            onSelect={handleModalSelect}
            isVideo={isPastedVideo}
          />
        )}
      </div>
    </div>
  );
}
