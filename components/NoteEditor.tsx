"use client";

import React, { forwardRef, useEffect, useImperativeHandle, useRef, useState, useCallback } from 'react';
import { useEditor, EditorContent, Editor } from '@tiptap/react';
import type { Content } from '@tiptap/core';
import { NodeSelection } from '@tiptap/pm/state';
import StarterKit from '@tiptap/starter-kit';
import Link from '@tiptap/extension-link';
import Placeholder from '@tiptap/extension-placeholder';
import TaskList from '@tiptap/extension-task-list';
import TaskItem from '@tiptap/extension-task-item';
import Underline from '@tiptap/extension-underline';
import CodeBlockLowlight from '@tiptap/extension-code-block-lowlight';
import { lowlight } from 'lowlight';

import SlashCommands from './extensions/SlashCommands';
import PageLink from './extensions/PageLink';
import VideoEmbed from './extensions/VideoEmbed';
import ResizableImage from './extensions/ResizableImage';
import TextColor from './extensions/TextColor';
import TextBackground from './extensions/TextBackground';
import UrlPasteModal from './UrlPasteModal';


// ─── Types ──────────────────────────────────────────────────────────────────────

export type NoteEditorHandle = {
    getEditor: () => Editor | null;
    focus: () => void;
    getHTML: () => string;
};

type NoteEditorProps = {
    initialContent: string;
    onChange: (html: string) => void;
    onFocus?: () => void;
    onBlur?: () => void;
    onPageCreate?: () => void;
    editable?: boolean;
    onSelectionChange?: (position: { top: number; left: number } | null) => void;
};

type UrlChoice = 'mention' | 'url' | 'bookmark' | 'embed';
type FloatingToolbarColorEventDetail = {
    action: 'apply' | 'reset';
    type: 'text' | 'bg';
    color?: string;
};

type FloatingToolbarLinkEventDetail = {
    href: string;
};

const URL_REGEX = /^(https?:\/\/[^\s]+)$/i;
const IMAGE_URL_REGEX = /https?:\/\/[^\s]+\.(jpg|jpeg|png|gif|webp|svg)(\?[^\s]*)?/i;
const VIDEO_URL_REGEX = /^(https?:\/\/)?(www\.)?(youtube\.com|youtu\.be|vimeo\.com|dailymotion\.com)\/.+$/i;
const DATA_IMAGE_REGEX = /^data:image\/[a-zA-Z0-9.+-]+;base64,[a-zA-Z0-9+/=]+$/i;

function looksLikeCode(text: string): boolean {
    const value = text.replace(/\r\n/g, '\n').trim();
    if (!value) return false;

    const lines = value.split('\n');
    if (lines.length < 2) return false;

    const hasIndentation = lines.some((line) => /^(\t| {2,})\S/.test(line));
    const hasBraces = /[{}[\]();]/.test(value);
    const hasOperators = /(=>|===|!==|&&|\|\||::|:=)/.test(value);
    const hasCommonKeywords = /\b(function|const|let|var|class|import|export|return|if|else|for|while|def|print|SELECT|INSERT|UPDATE|DELETE|FROM|WHERE|CREATE TABLE)\b/.test(value);
    const hasTagLikeMarkup = /<\/?[a-z][\s\S]*>/i.test(value);

    return hasIndentation || hasBraces || hasOperators || hasCommonKeywords || hasTagLikeMarkup;
}

function detectCodeLanguage(text: string): string {
    const value = text.trim();

    try {
        const auto = lowlight.highlightAuto(value);
        const detected = auto?.data?.language;
        if (detected) return detected;
    } catch {
        // fallback heuristics below
    }

    if (/^\s*[{[][\s\S]*[}\]]\s*$/.test(value)) return 'json';
    if (/<[a-z][\s\S]*>/i.test(value) && /<\/[a-z]+>/i.test(value)) return 'html';
    if (/\b(function|const|let|var|import|export|=>)\b/.test(value)) return 'javascript';
    if (/\b(interface|type|enum|implements|readonly)\b/.test(value) || /:\s*(string|number|boolean|unknown|any)\b/.test(value)) return 'typescript';
    if (/\bdef\b|\bimport\b|\bfrom\b|\bprint\(/.test(value)) return 'python';
    if (/^\s*(SELECT|INSERT|UPDATE|DELETE|CREATE|ALTER|DROP)\b/im.test(value)) return 'sql';
    if (/^\s*#!/.test(value) || /\b(echo|fi|then|elif)\b/.test(value)) return 'bash';
    if (/[.#][\w-]+\s*\{[\s\S]*\}/.test(value)) return 'css';

    return 'plaintext';
}

function toEmbedUrl(url: string) {
    try {
        const parsed = new URL(url.startsWith('http') ? url : `https://${url}`);

        if (parsed.hostname.includes('youtube.com')) {
            const videoId = parsed.searchParams.get('v');
            if (videoId) return `https://www.youtube.com/embed/${videoId}`;
        }

        if (parsed.hostname.includes('youtu.be')) {
            const videoId = parsed.pathname.slice(1);
            if (videoId) return `https://www.youtube.com/embed/${videoId}`;
        }

        if (parsed.hostname.includes('vimeo.com')) {
            const videoId = parsed.pathname.split('/').pop();
            if (videoId && /^\d+$/.test(videoId)) {
                return `https://player.vimeo.com/video/${videoId}`;
            }
        }

        if (parsed.hostname.includes('dailymotion.com')) {
            const videoId = parsed.pathname.split('/').pop()?.split('_')[0];
            if (videoId) return `https://www.dailymotion.com/embed/video/${videoId}`;
        }
    } catch {
        return url;
    }

    return url;
}

/**
 * Convert nolio-style <a> page links into cognition-style <div data-type="pageLink">
 * so Tiptap's PageLink block node can parse them correctly.
 */
function migrateNolioPageLinksToDiv(html: string): string {
    if (!html) return html;
    // Match <a> tags with nolio-page-link class or nolio-page:// href (including when wrapped in <p>)
    return html.replace(
        /<p>\s*<a\b([^>]*)>([\s\S]*?)<\/a>\s*<\/p>|<a\b([^>]*)>([\s\S]*?)<\/a>/gi,
        (match, attrsInP, textInP, attrsStandalone, textStandalone) => {
            const attrs = attrsInP || attrsStandalone || '';
            const text = textInP || textStandalone || '';

            const isNolioLink =
                /class="[^"]*nolio-page-link[^"]*"/i.test(attrs) ||
                /href="nolio-page:\/\//i.test(attrs);
            if (!isNolioLink) return match;

            // Extract pageId from data-page-id or href
            let pageId = '';
            let title = text.trim() || 'Nova página';

            const dataIdMatch = attrs.match(/data-page-id="([^"]*)"/i);
            if (dataIdMatch) pageId = dataIdMatch[1];

            const dataTitleMatch = attrs.match(/data-page-title="([^"]*)"/i);
            if (dataTitleMatch && dataTitleMatch[1]) title = dataTitleMatch[1];

            if (!pageId) {
                const hrefMatch = attrs.match(/href="([^"]*)"/i);
                const href = hrefMatch?.[1]?.replace(/&amp;/g, '&') || '';
                if (href.startsWith('nolio-page://')) {
                    try {
                        const parsed = new URL(href);
                        pageId = decodeURIComponent(parsed.hostname || '');
                        if (!title || title === 'Nova página') {
                            title = decodeURIComponent(parsed.searchParams.get('title') || '') || title;
                        }
                    } catch { /* ignore */ }
                }
            }

            if (!pageId) return match;

            const escAttr = (s: string) => s.replace(/&/g, '&amp;').replace(/"/g, '&quot;');
            return `<div data-type="pageLink" data-page-id="${escAttr(pageId)}" data-title="${escAttr(title)}"></div>`;
        }
    );
}

// ─── Component ──────────────────────────────────────────────────────────────────

const NoteEditor = forwardRef<NoteEditorHandle, NoteEditorProps>(
    function NoteEditor(
        { initialContent, onChange, onFocus, onBlur, onPageCreate, onSelectionChange, editable = true },
        ref
    ) {
        const hasInitialisedRef = useRef(false);
        const [isUrlModalOpen, setIsUrlModalOpen] = useState(false);
        const [pastedUrl, setPastedUrl] = useState('');
        const [isPastedVideo, setIsPastedVideo] = useState(false);
        const [modalPosition, setModalPosition] = useState({ top: 0, left: 0 });
        const [pasteRange, setPasteRange] = useState<{ from: number; to: number } | null>(null);

        const editor = useEditor({
            immediatelyRender: false,
            extensions: [
                StarterKit.configure({
                    heading: { levels: [1, 2, 3] },
                    codeBlock: false, // replaced by CodeBlockLowlight
                }),
                Link.configure({
                    openOnClick: false,
                    autolink: true,
                    protocols: ['http', 'https'],
                    HTMLAttributes: {
                        class: 'text-[#2383e2] underline underline-offset-2 cursor-pointer',
                        'data-cognition-link': 'true',
                    },
                }),
                Placeholder.configure({
                    placeholder: ({ node }) => {
                        if (node.type.name === 'heading') {
                            const level = node.attrs.level;
                            return `Título ${level}`;
                        }
                        return "Digite '/' para comandos";
                    },
                }),
                TaskList,
                TaskItem.configure({ nested: true }),
                ResizableImage.configure({
                    inline: false,
                }),
                Underline,
                TextColor,
                TextBackground,
                CodeBlockLowlight.configure({
                    lowlight,
                    HTMLAttributes: {
                        class: 'bg-[#202020] border border-[#333] rounded-md p-4 font-mono text-sm text-gray-300',
                    },
                }),
                PageLink,
                VideoEmbed,
                SlashCommands.configure({
                    onPageCreate: () => {
                        onPageCreate?.();
                    },
                }),
            ],
            content: migrateNolioPageLinksToDiv(initialContent),
            editable,
            onSelectionUpdate: ({ editor: currentEditor }) => {
                if (!currentEditor.isFocused) return;
                const { view, state } = currentEditor;
                const { from } = state.selection;
                try {
                    const coords = view.coordsAtPos(from);
                    onSelectionChange?.({
                        top: coords.bottom + window.scrollY + 8,
                        left: coords.left + window.scrollX,
                    });
                } catch (e) {
                    console.warn('Failed to get cursor coords', e);
                }
            },
            editorProps: {
                attributes: {
                    class: 'note-editor-content outline-none min-h-[200px]',
                },
                handleDOMEvents: {
                    focus: () => {
                        onFocus?.();
                        return false;
                    },
                    blur: () => {
                        onBlur?.();
                        return false;
                    },
                    paste: (_, event) => {
                        const clipboardEvent = event as ClipboardEvent;
                        const text = clipboardEvent.clipboardData?.getData('text/plain')?.trim() || '';
                        const rawText = clipboardEvent.clipboardData?.getData('text/plain') || '';

                        const isUrl = URL_REGEX.test(text);
                        const isImageUrl = IMAGE_URL_REGEX.test(text);
                        const isVideoUrl = VIDEO_URL_REGEX.test(text);
                        const isDataImage = DATA_IMAGE_REGEX.test(text);

                        if (isUrl || isImageUrl || isVideoUrl || isDataImage) {
                            clipboardEvent.preventDefault();
                            const pos = editor?.state.selection.from ?? 0;
                            const coords = editor?.view.coordsAtPos(pos);

                            if (coords) {
                                setModalPosition({
                                    top: coords.bottom + window.scrollY + 8,
                                    left: coords.left + window.scrollX,
                                });
                            }

                            setPastedUrl(text);
                            setIsPastedVideo(isVideoUrl);
                            setPasteRange({
                                from: editor?.state.selection.from ?? 0,
                                to: editor?.state.selection.to ?? 0,
                            });
                            setIsUrlModalOpen(true);
                            return true;
                        }

                        if (looksLikeCode(rawText) && editor) {
                            clipboardEvent.preventDefault();
                            const language = detectCodeLanguage(rawText);
                            const range = editor.state.selection;
                            editor
                                .chain()
                                .focus()
                                .insertContentAt(
                                    { from: range.from, to: range.to },
                                    {
                                        type: 'codeBlock',
                                        attrs: { language },
                                        content: [{ type: 'text', text: rawText.replace(/\r\n/g, '\n') }],
                                    }
                                )
                                .run();
                            return true;
                        }

                        return false;
                    },
                },
                handleKeyDown: (view, event) => {
                    if (event.key !== 'Backspace' && event.key !== 'Delete') {
                        return false;
                    }

                    const selection = view.state.selection;
                    if (!(selection instanceof NodeSelection)) {
                        return false;
                    }

                    const selectedNodeType = selection.node.type.name;
                    if (!['image', 'videoEmbed', 'pageLink'].includes(selectedNodeType)) {
                        return false;
                    }

                    event.preventDefault();
                    editor?.commands.deleteSelection();
                    return true;
                },
            },
            onUpdate: ({ editor: currentEditor }) => {
                onChange(currentEditor.getHTML());
            },
        });

        const handleUrlModalSelect = useCallback((option: UrlChoice) => {
            if (!editor || !pastedUrl) return;
            const target = pasteRange ?? { from: editor.state.selection.from, to: editor.state.selection.to };
            const insertAtPaste = (content: Content) => {
                const insertedAtTarget = editor.chain().focus().insertContentAt(target, content).run();
                if (insertedAtTarget) return true;

                const insertedAtSelection = editor.chain().focus().setTextSelection(target.from).insertContent(content).run();
                if (insertedAtSelection) return true;

                return editor.chain().focus().insertContent(content).run();
            };
            const insertEmbedInSafeBlock = (content: Content) => {
                return (
                    insertAtPaste(content) ||
                    editor
                        .chain()
                        .focus()
                        .insertContentAt(target.from, [{ type: 'paragraph' }, content, { type: 'paragraph' }])
                        .run() ||
                    editor.chain().focus().insertContent([{ type: 'paragraph' }, content, { type: 'paragraph' }]).run()
                );
            };

            if (option === 'embed') {
                if (isPastedVideo) {
                    const inserted = insertEmbedInSafeBlock({
                        type: 'videoEmbed',
                        attrs: {
                            src: toEmbedUrl(pastedUrl),
                            width: '100%',
                            height: '450px',
                        },
                    });
                    if (!inserted) {
                        editor.chain().focus().insertContent(`<a href="${pastedUrl}" target="_blank" rel="noopener noreferrer">${pastedUrl}</a>`).run();
                    }
                } else {
                    const inserted = insertEmbedInSafeBlock({
                        type: 'image',
                        attrs: { src: pastedUrl, width: '100%', height: 'auto' },
                    });
                    if (!inserted) {
                        editor.chain().focus().insertContent(`<a href="${pastedUrl}" target="_blank" rel="noopener noreferrer">${pastedUrl}</a>`).run();
                    }
                }
                return;
            }

            if (option === 'mention') {
                let mentionLabel = pastedUrl;
                try {
                    mentionLabel = `@${new URL(pastedUrl).hostname.replace(/^www\./, '')}`;
                } catch {
                    // keep fallback label
                }
                editor
                    .chain()
                    .focus()
                    .insertContentAt(target, `<a href="${pastedUrl}" target="_blank" rel="noopener noreferrer">${mentionLabel}</a>`)
                    .run();
                return;
            }

            if (option === 'bookmark') {
                editor
                    .chain()
                    .focus()
                    .insertContentAt(target, `<blockquote><p><a href="${pastedUrl}" target="_blank" rel="noopener noreferrer">${pastedUrl}</a></p></blockquote><p></p>`)
                    .run();
                return;
            }

            editor
                .chain()
                .focus()
                .insertContentAt(target, `<a href="${pastedUrl}" target="_blank" rel="noopener noreferrer">${pastedUrl}</a>`)
                .run();
        }, [editor, pastedUrl, isPastedVideo, pasteRange]);

        useEffect(() => {
            if (!editor) return;

            const handleFloatingToolbarColor = (event: Event) => {
                const customEvent = event as CustomEvent<FloatingToolbarColorEventDetail>;
                const detail = customEvent.detail;
                if (!detail) return;

                if (detail.action === 'apply' && detail.type === 'text' && detail.color) {
                    editor.chain().focus().setTextColor(detail.color).run();
                    return;
                }

                if (detail.action === 'apply' && detail.type === 'bg' && detail.color) {
                    const { from } = editor.state.selection;
                    const $from = editor.state.doc.resolve(from);
                    const lineFrom = $from.start($from.depth);
                    const lineTo = $from.end($from.depth);

                    editor
                        .chain()
                        .focus()
                        .setTextSelection({ from: lineFrom, to: lineTo })
                        .setTextBackground(detail.color)
                        .run();
                    return;
                }

                if (detail.action === 'reset' && detail.type === 'text') {
                    editor.chain().focus().unsetTextColor().run();
                    return;
                }

                if (detail.action === 'reset' && detail.type === 'bg') {
                    const { from } = editor.state.selection;
                    const $from = editor.state.doc.resolve(from);
                    const lineFrom = $from.start($from.depth);
                    const lineTo = $from.end($from.depth);

                    editor
                        .chain()
                        .focus()
                        .setTextSelection({ from: lineFrom, to: lineTo })
                        .unsetTextBackground()
                        .run();
                }
            };

            document.addEventListener('floatingToolbarColor', handleFloatingToolbarColor as EventListener);
            return () => {
                document.removeEventListener('floatingToolbarColor', handleFloatingToolbarColor as EventListener);
            };
        }, [editor]);

        useEffect(() => {
            if (!editor) return;

            const handleFloatingToolbarLink = (event: Event) => {
                const customEvent = event as CustomEvent<FloatingToolbarLinkEventDetail>;
                const detail = customEvent.detail;
                const href = detail?.href?.trim();
                if (!href) return;

                editor.chain().focus().extendMarkRange('link').setLink({ href }).run();
            };

            document.addEventListener('floatingToolbarLink', handleFloatingToolbarLink as EventListener);
            return () => {
                document.removeEventListener('floatingToolbarLink', handleFloatingToolbarLink as EventListener);
            };
        }, [editor]);

        // Set initial content only once when editor is ready and content arrives
        useEffect(() => {
            if (!editor || hasInitialisedRef.current) return;
            if (initialContent) {
                editor.commands.setContent(migrateNolioPageLinksToDiv(initialContent), { emitUpdate: false });
                hasInitialisedRef.current = true;
            }
        }, [editor, initialContent]);

        useImperativeHandle(
            ref,
            () => ({
                getEditor: () => editor,
                focus: () => editor?.commands.focus(),
                getHTML: () => editor?.getHTML() || '',
            }),
            [editor]
        );

        if (!editor) return null;

        return (
            <>
                <EditorContent editor={editor} />
                {isUrlModalOpen && (
                    <UrlPasteModal
                        onClose={() => setIsUrlModalOpen(false)}
                        onSelect={handleUrlModalSelect}
                        position={modalPosition}
                        isVideo={isPastedVideo}
                    />
                )}
            </>
        );
    }
);

export default NoteEditor;
