"use client";

import { Node, mergeAttributes } from '@tiptap/core';
import { ReactNodeViewRenderer, NodeViewWrapper, type NodeViewProps } from '@tiptap/react';
import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { FileText } from 'lucide-react';
import { useNoteTitle } from '@/context/NoteContext';
import api from '@/lib/api';

// ─── React Component for the Node View ────────────────────────────────────────

function PageLinkView({ node }: NodeViewProps) {
    const pageId = String(node.attrs.pageId || '');
    const attrTitle = String(node.attrs.title || '');
    const liveTitle = useNoteTitle(pageId);
    const router = useRouter();
    const [fetchedTitle, setFetchedTitle] = useState<string>('');
    const [loading, setLoading] = useState(true);

    // Fetch the real title from the API when mounted
    useEffect(() => {
        if (!pageId) return;
        let cancelled = false;
        setLoading(true);
        api.get(`/notes/${pageId}`).then((res) => {
            if (!cancelled) {
                const noteTitle = res.data?.title;
                if (noteTitle) {
                    setFetchedTitle(noteTitle);
                }
            }
        }).catch(() => {
            // ignore errors — fallback to attr title
        }).finally(() => {
            if (!cancelled) setLoading(false);
        });
        return () => { cancelled = true; };
    }, [pageId]);

    // Priority: live context title > fetched API title > stored attr title > fallback
    // While loading, suppress the default "Nova página" to avoid a flash
    const hasRealAttrTitle = attrTitle && attrTitle !== 'Nova página';
    const displayTitle =
        liveTitle ||
        fetchedTitle ||
        (loading ? (hasRealAttrTitle ? attrTitle : '') : attrTitle) ||
        'Nova página';

    return (
        <NodeViewWrapper contentEditable={false} data-type="pageLink">
            <a
                href={`/${pageId}`}
                className="flex items-center gap-2 w-full p-1.5 my-1 hover:bg-[#2f2f2f] rounded transition-colors group/link no-underline"
                onMouseDownCapture={(event) => {
                    // Prevent ProseMirror/Tiptap link handlers from also reacting to this click.
                    if (!pageId) return;
                    if (
                        event.defaultPrevented ||
                        event.button !== 0 ||
                        event.metaKey ||
                        event.ctrlKey ||
                        event.shiftKey ||
                        event.altKey
                    ) {
                        return;
                    }
                    event.preventDefault();
                    event.stopPropagation();
                }}
                onClick={(event) => {
                    if (!pageId) return;
                    if (
                        event.defaultPrevented ||
                        event.button !== 0 ||
                        event.metaKey ||
                        event.ctrlKey ||
                        event.shiftKey ||
                        event.altKey
                    ) {
                        return;
                    }
                    event.preventDefault();
                    event.stopPropagation();
                    router.push(`/${pageId}`);
                }}
            >
                <FileText size={20} className="text-[#9b9b9b] group-hover/link:text-white shrink-0" />
                <span className="text-base text-white font-medium truncate underline-offset-4 group-hover/link:underline">
                    {displayTitle}
                </span>
            </a>
        </NodeViewWrapper>
    );
}

// ─── Tiptap Node Extension ────────────────────────────────────────────────────

const PageLink = Node.create({
    name: 'pageLink',
    group: 'block',
    atom: true,

    addAttributes() {
        return {
            pageId: {
                default: '',
                parseHTML: (element: HTMLElement) => {
                    // Support both cognition (data-page-id) and nolio (data-page-id or href) formats
                    const dataId = element.getAttribute('data-page-id');
                    if (dataId) return dataId;
                    // Extract from nolio-page:// href
                    const href = element.getAttribute('href') || '';
                    if (href.startsWith('nolio-page://')) {
                        try {
                            const parsed = new URL(href);
                            return decodeURIComponent(parsed.hostname || '');
                        } catch { /* ignore */ }
                    }
                    return '';
                },
                renderHTML: (attributes: Record<string, string>) => ({
                    'data-page-id': attributes.pageId,
                }),
            },
            title: {
                default: 'Nova página',
                parseHTML: (element: HTMLElement) => {
                    // Support both cognition (data-title) and nolio (data-page-title or href query) formats
                    const dataTitle = element.getAttribute('data-title') || element.getAttribute('data-page-title');
                    if (dataTitle) return dataTitle;
                    // Extract from nolio-page:// href query param
                    const href = element.getAttribute('href') || '';
                    if (href.startsWith('nolio-page://')) {
                        try {
                            const parsed = new URL(href);
                            return decodeURIComponent(parsed.searchParams.get('title') || '') || element.textContent || 'Nova página';
                        } catch { /* ignore */ }
                    }
                    return element.textContent || 'Nova página';
                },
                renderHTML: (attributes: Record<string, string>) => ({
                    'data-title': attributes.title,
                }),
            },
        };
    },

    parseHTML() {
        return [
            {
                tag: 'div[data-type="pageLink"]',
            },
            {
                tag: 'a.nolio-page-link',
                priority: 51,
            },
            {
                tag: 'a[href^="nolio-page://"]',
                priority: 51,
            },
        ];
    },

    renderHTML({ HTMLAttributes }: { HTMLAttributes: Record<string, unknown> }) {
        return ['div', mergeAttributes({ 'data-type': 'pageLink' }, HTMLAttributes)];
    },

    addNodeView() {
        return ReactNodeViewRenderer(PageLinkView);
    },
});

export default PageLink;
