'use client';

import { useEffect, useMemo, useRef, useState, useCallback } from 'react';
import { useRouter, useParams, useSearchParams } from 'next/navigation';
import { useTranslations } from 'next-intl';
import Link from 'next/link';
import {
  MoreHorizontal,
  Menu,
  ChevronsRight,
  LockKeyhole,
  ChevronDown,
  Star,
  ChevronRight,
  Share,
  Trash2,
  RotateCcw,
} from 'lucide-react';

import Sidebar from '@/components/Sidebar';
import PageOptionsModal from '@/components/PageOptionsModal';
import ShareModal from '@/components/ShareModal';
import NoteEditor, { type NoteEditorHandle } from '@/components/NoteEditor';
import FloatingToolbar from '@/components/FloatingToolbar';
import FloatingMobileToolbar from '@/components/FloatingMobileToolbar';
import ConfirmationModal from '@/components/ConfirmationModal';
import api from '@/lib/api';
import { Note } from '@/types/note';
import { useAuth } from '@/context/AuthContext';
import { useLayout } from '@/context/LayoutContext';
import { useFavorite } from '@/context/FavoriteContext';
import { useNote } from '@/context/NoteContext';
import { createNoteSlug, extractIdFromSlug } from '@/lib/utils';

export default function NotePage() {
  const t = useTranslations('NotePage');
  const router = useRouter();
  const params = useParams();
  const searchParams = useSearchParams();
  const { session } = useAuth();
  const { isSidebarOpen, setIsSidebarOpen } = useLayout();
  const [isTrashDeleteConfirmOpen, setIsTrashDeleteConfirmOpen] = useState(false);
  const [isDeletingFromTrash, setIsDeletingFromTrash] = useState(false);
  const { favoriteNotes, toggleFavorite, removeNoteFromFavorites } = useFavorite();
  const { updatedTitles, updateNoteTitle, updateNoteHasContent } = useNote();

  const [note, setNote] = useState<Note | null>(null);
  const [parentNote, setParentNote] = useState<Note | null>(null);
  const [title, setTitle] = useState('');
  const [editorHtml, setEditorHtml] = useState('<p></p>');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isFloatingOpen, setIsFloatingOpen] = useState(false);
  const [isOptionsModalOpen, setIsOptionsModalOpen] = useState(false);
  const [isShareModalOpen, setIsShareModalOpen] = useState(false);
  const [shareButtonPosition, setShareButtonPosition] = useState<{ top: number; left: number } | null>(null);
  const [lastSavedTitle, setLastSavedTitle] = useState('');
  const [lastSavedDescription, setLastSavedDescription] = useState('');
  const [isMobile, setIsMobile] = useState(false);
  const [isMobileToolbarVisible, setIsMobileToolbarVisible] = useState(false);
  const [mobileToolbarPosition, setMobileToolbarPosition] = useState<{ top: number; left: number } | null>(null);

  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 768);
    };
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  const saveDebounceRef = useRef<NodeJS.Timeout | null>(null);
  const titleInputRef = useRef<HTMLTextAreaElement>(null);
  const shareButtonRef = useRef<HTMLButtonElement>(null);
  const noteEditorRef = useRef<NoteEditorHandle>(null);

  const storedDefaultTitle = 'Nova página';
  const displayDefaultTitle = t('defaultTitle');

  const htmlToPlainText = useCallback((html: string) => {
    if (typeof document === 'undefined') return html;
    const el = document.createElement('div');
    el.innerHTML = html;
    return (el.innerText || '').trim();
  }, []);

  const descriptionText = useMemo(() => htmlToPlainText(editorHtml), [editorHtml, htmlToPlainText]);

  useEffect(() => {
    const textarea = titleInputRef.current;
    if (textarea) {
      textarea.style.height = 'auto';
      textarea.style.height = `${textarea.scrollHeight}px`;
    }
  }, [title]);

  useEffect(() => {
    async function fetchNote() {
      if (!session) return;

      const slug = params?.slug;
      if (!slug) return;

      const slugString = Array.isArray(slug) ? slug[0] : slug;
      const noteId = extractIdFromSlug(slugString);

      if (note && note.id === noteId) return;

      try {
        setLoading(true);
        setError(null);

        const [noteResponse] = await Promise.all([
          api.get(`/notes/${noteId}`, {
            headers: { Authorization: `Bearer ${session.accessToken}` },
          }),
        ]);

        const noteData = noteResponse.data as Note & { parentId?: string | null; parent_id?: string | null };
        const rawTitle = noteData.title === storedDefaultTitle ? '' : noteData.title;
        const rawDescription = noteData.description || '<p></p>';
        const nextHtml = rawDescription.trim() ? rawDescription : '<p></p>';

        setNote(noteData);
        setTitle(rawTitle);
        setEditorHtml(nextHtml);
        setLastSavedTitle(rawTitle);
        setLastSavedDescription(rawDescription);

        const hasInitialContent =
          rawTitle.trim() !== '' &&
          htmlToPlainText(nextHtml).trim() !== '';
        updateNoteHasContent(noteData.id, hasInitialContent);

        const parentId = noteData.parentId || noteData.parent_id;
        if (parentId) {
          try {
            const parentResponse = await api.get(`/notes/${parentId}`, {
              headers: { Authorization: `Bearer ${session.accessToken}` },
            });
            setParentNote(parentResponse.data);
          } catch {
            setParentNote(null);
          }
        } else {
          setParentNote(null);
        }
      } catch (loadError) {
        console.error('Error fetching note:', loadError);
        setError(t('errors.noteNotFound'));
      } finally {
        setLoading(false);
      }
    }

    void fetchNote();
  }, [session, params, note, storedDefaultTitle, t, updateNoteHasContent, htmlToPlainText]);

  useEffect(() => {
    if (!loading && searchParams?.get('showMoveTo')) {
      titleInputRef.current?.focus();
    }
  }, [loading, searchParams]);

  useEffect(() => {
    if (!note || loading) return;

    const hasContent =
      title.trim() !== '' &&
      title !== storedDefaultTitle &&
      descriptionText.trim() !== '';
    updateNoteHasContent(note.id, hasContent);
  }, [title, descriptionText, note, loading, storedDefaultTitle, updateNoteHasContent]);

  useEffect(() => {
    if (saveDebounceRef.current) clearTimeout(saveDebounceRef.current);
    if (!note || !session || loading) return;
    const titleChanged = title !== lastSavedTitle;
    const descriptionChanged = editorHtml !== lastSavedDescription;

    if (!titleChanged && !descriptionChanged) return;

    saveDebounceRef.current = setTimeout(async () => {
      try {
        const payload: { title?: string; description?: string } = {};
        if (titleChanged) payload.title = title;
        if (descriptionChanged) payload.description = editorHtml;

        await api.put(
          `/notes/${note.id}`,
          payload,
          { headers: { Authorization: `Bearer ${session.accessToken}` } }
        );
        if (titleChanged) setLastSavedTitle(title);
        if (descriptionChanged) setLastSavedDescription(editorHtml);
      } catch (saveError) {
        console.error('Failed to save note', saveError);
      }
    }, 1000);

    return () => {
      if (saveDebounceRef.current) clearTimeout(saveDebounceRef.current);
    };
  }, [title, editorHtml, note, session, loading, lastSavedTitle, lastSavedDescription]);

  useEffect(() => {
    return () => {
      if (saveDebounceRef.current) clearTimeout(saveDebounceRef.current);
    };
  }, []);

  const handleTitleChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const newTitle = e.target.value;
    setTitle(newTitle);

    if (!note) return;

    updateNoteTitle(note.id, newTitle);

    const cleanId = note.id.replace(/-/g, '');
    const newSlug = newTitle.trim() ? createNoteSlug(newTitle, note.id) : cleanId;
    const currentSearch = window.location.search;
    window.history.replaceState(null, '', `/${newSlug}${currentSearch}`);
  };

  const handleTitleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key !== 'Enter' || e.nativeEvent.isComposing) return;
    e.preventDefault();
    const editor = noteEditorRef.current?.getEditor();
    if (editor) {
      editor.commands.focus('start');
      return;
    }
    noteEditorRef.current?.focus();
  };

  const copyTextToClipboard = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      return;
    } catch {
      const textarea = document.createElement('textarea');
      textarea.value = text;
      textarea.setAttribute('readonly', '');
      textarea.style.position = 'fixed';
      textarea.style.top = '-9999px';
      document.body.appendChild(textarea);
      textarea.focus();
      textarea.select();
      document.execCommand('copy');
      document.body.removeChild(textarea);
    }
  };

  const handleCopyPageContents = async () => {
    const cleanTitle = title.trim() || displayDefaultTitle;
    const bodyText = htmlToPlainText(editorHtml);
    const pageText = `${cleanTitle}\n\n${bodyText}`.trimEnd();
    await copyTextToClipboard(pageText);
  };

  const handleRestore = async () => {
    if (!note || !session) return;
    try {
      await api.patch(`/notes/trash/${note.id}`);
      setNote((prev) => (prev ? { ...prev, is_deleted: false, deleted_at: null } : null));
    } catch (restoreError) {
      console.error('Failed to restore note:', restoreError);
    }
  };

  const handlePermanentDelete = async () => {
    if (!note || !session) return;
    try {
      await api.delete(`/notes/trash/${note.id}`);
      router.push('/');
    } catch (deleteError) {
      console.error('Failed to permanently delete note:', deleteError);
    }
  };

  const getMinutesSinceDeletion = () => {
    if (!note?.deleted_at) return 0;
    const deletedAt = new Date(note.deleted_at);
    const now = new Date();
    const diff = now.getTime() - deletedAt.getTime();
    const minutes = Math.floor(diff / 60000);
    return minutes > 0 ? minutes : 0;
  };

  const handleToggleFavorite = () => {
    if (!note) return;
    toggleFavorite(note);
    setNote((prev) => (prev ? { ...prev, is_favorite: !prev.is_favorite } : null));
  };

  const handleDeleteNote = async () => {
    if (!note || !session) return;

    try {
      await api.delete(`/notes/${note.id}`, {
        headers: { Authorization: `Bearer ${session.accessToken}` },
      });
      removeNoteFromFavorites(note.id);
      setIsOptionsModalOpen(false);
      router.push('/');
    } catch (deleteError) {
      console.error('Error deleting note:', deleteError);
      alert(t('errors.deleteNote'));
    }
  };

  const handleCreatePageFromEditor = useCallback(async () => {
    if (!note || !session) return;

    try {
      const response = await api.post(
        '/notes',
        { title: storedDefaultTitle, parentId: note.id },
        { headers: { Authorization: `Bearer ${session.accessToken}` } }
      );

      const newNote = response.data as Note;
      const cleanId = newNote.id.replace(/-/g, '');
      const displayTitle = newNote.title || storedDefaultTitle;

      const editor = noteEditorRef.current?.getEditor();
      if (editor) {
        editor
          .chain()
          .focus()
          .insertContent(`<div data-type="pageLink" data-page-id="${cleanId}" data-title="${displayTitle}"></div><p></p>`)
          .run();

        const currentHtml = editor.getHTML();
        await api.put(
          `/notes/${note.id}`,
          { description: currentHtml },
          { headers: { Authorization: `Bearer ${session.accessToken}` } }
        );
        setLastSavedDescription(currentHtml);
      }

      router.push(`/${cleanId}?showMoveTo=true&saveParent=true`);
    } catch (createError) {
      console.error('Error creating child note from slash menu:', createError);
    }
  }, [note, session, storedDefaultTitle, router]);

  const isFavorite = note ? favoriteNotes.some((item) => item.id === note.id) : false;

  const wordCount = useMemo(() => {
    const titleText = title || '';
    const fullText = `${titleText} ${descriptionText}`.trim();
    return fullText ? fullText.split(/\s+/).length : 0;
  }, [title, descriptionText]);

  useEffect(() => {
    if (title) {
      document.title = title;
    } else if (note) {
      document.title = displayDefaultTitle;
    }
  }, [title, note, displayDefaultTitle]);

  const SidebarElement = () => (isSidebarOpen ? <Sidebar /> : null);

  if (loading) {
    return (
      <div className="flex min-h-screen bg-white dark:bg-[#191919]">
        <SidebarElement />
        <main className="flex-1 flex flex-col min-h-screen md:h-screen md:overflow-hidden">
          <div className="h-12 flex items-center justify-between px-4 relative z-20 overflow-hidden">
            <div className="flex items-center gap-2 min-w-0">
              {!isSidebarOpen && <div className="w-8 h-8 bg-[#2f2f2f] rounded animate-pulse shrink-0" />}
              <div className="flex items-center gap-2 min-w-0">
                <div className="h-4 w-24 md:w-32 bg-[#2f2f2f] rounded animate-pulse shrink-0" />
                <div className="h-4 w-4 bg-[#2f2f2f] rounded animate-pulse hidden md:block shrink-0" />
                <div className="h-4 w-20 md:w-24 bg-[#2f2f2f] rounded animate-pulse hidden md:block shrink-0" />
              </div>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              <div className="h-7 w-7 md:w-28 bg-[#2f2f2f] rounded animate-pulse" />
              <div className="h-7 w-7 bg-[#2f2f2f] rounded animate-pulse" />
              <div className="h-7 w-7 bg-[#2f2f2f] rounded animate-pulse" />
            </div>
          </div>

          <div className="flex-1 flex items-center justify-center">
            <div className="w-6 h-6 border-2 border-[#383836] border-t-white/80 rounded-full animate-spin" />
          </div>
        </main>
      </div>
    );
  }

  if (error || !note) {
    return (
      <div className="flex min-h-screen bg-white dark:bg-[#191919]">
        <SidebarElement />
        <div className="flex-1 flex items-center justify-center text-gray-500">
          {error || t('errors.noteNotFound')}
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen bg-white dark:bg-[#191919]">
      {isSidebarOpen && <Sidebar />}

      <main className="flex-1 flex flex-col min-h-screen md:h-screen md:overflow-hidden">
        <div className="h-12 flex items-center justify-between px-4 relative z-20">
          <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400">
            {!isSidebarOpen && (
              <div
                className="relative group"
                onMouseEnter={() => {
                  if (window.innerWidth >= 768) {
                    setIsFloatingOpen(true);
                  }
                }}
                onMouseLeave={() => setIsFloatingOpen(false)}
              >
	                <button
	                  onClick={() => setIsSidebarOpen(true)}
	                  className="p-1 hover:bg-gray-100 dark:hover:bg-[#2f2f2f] rounded transition-colors"
	                >
	                  <Menu size={22} className="md:group-hover:hidden text-gray-700 dark:text-[#f0efed]" />
	                  <ChevronsRight size={20} className="hidden md:group-hover:block text-gray-700 dark:text-[#e6e5e3]" />
	                </button>

                {isFloatingOpen && (
                  <div className="absolute top-full left-0 mt-2 w-60 max-h-[80vh] shadow-xl rounded-lg overflow-visible border border-[#2f2f2f] bg-[#202020] animate-in fade-in zoom-in-95 duration-100 origin-top-left">
                    <Sidebar isFloating={true} />
                  </div>
                )}
              </div>
            )}

            <div className="flex items-center">
              {parentNote && (
                <>
	                  <Link
	                    href={`/${createNoteSlug(updatedTitles[parentNote.id] || parentNote.title, parentNote.id)}`}
	                    className="text-sm text-gray-500 hover:text-gray-900 truncate max-w-[120px] md:max-w-[200px] hover:bg-gray-100 dark:text-[#ada9a3] dark:hover:text-[#f0efed] dark:hover:bg-[#fffff315] px-2 py-1 rounded-md transition-colors"
	                  >
	                    {updatedTitles[parentNote.id] || parentNote.title || displayDefaultTitle}
	                  </Link>
	                  <ChevronRight size={14} className="text-gray-400 dark:text-[#7d7a75]" />
	                </>
	              )}

	              <button className="text-sm text-gray-900 dark:text-[#f0efed] font-normal truncate max-w-[150px] md:max-w-[300px] hover:bg-gray-100 dark:hover:bg-[#fffff315] px-2 py-1 rounded-md">
	                {title.trim() || displayDefaultTitle}
	              </button>

	              <div className="hidden md:flex relative group/particular">
	                <button className="flex items-center justify-center text-sm font-normal text-gray-500 dark:text-[#7d7a75] hover:text-gray-900 dark:hover:text-[#f0efed] gap-2 hover:bg-gray-100 dark:hover:bg-[#202020] px-2 py-1 rounded-md">
	                  <LockKeyhole size={14} />
	                  {t('privacy.private')}
	                  <ChevronDown size={14} />
	                </button>
                <div className="absolute left-full top-1/2 -translate-y-1/2 ml-2 hidden group-hover/particular:block bg-[#2f2f2f] text-[#f0efed] text-xs p-1 rounded-md shadow-xl whitespace-nowrap z-50 border border-[#3f3f3f]">
                  {t('privacy.onlyYouHaveAccess')} <br />
                  <span className="text-gray-400">{t('privacy.clickToMove')}</span>
                </div>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <div className="relative group/share">
              <button
                ref={shareButtonRef}
                onClick={() => {
                  if (shareButtonRef.current) {
                    const rect = shareButtonRef.current.getBoundingClientRect();
                    setShareButtonPosition({ top: rect.bottom, left: rect.left });
                  }
                  setIsShareModalOpen(!isShareModalOpen);
                }}
                className={`flex items-center justify-center md:gap-2 border border-[#383836] text-sm p-1.5 md:px-2 md:py-1 rounded-md transition-colors ${isShareModalOpen ? 'bg-[#fffff315]' : 'hover:bg-[#fffff315]'}`}
              >
                <Share size={18} className="md:hidden" />
                <LockKeyhole size={14} className="hidden md:inline" />
                <span className="hidden md:inline">{t('actions.share')}</span>
                <ChevronDown size={14} className="hidden md:inline" />
              </button>

              <div className="absolute top-full left-1/2 -translate-x-1/2 mt-2 hidden group-hover/share:block bg-[#2f2f2f] text-[#f0efed] text-xs p-2 rounded-md shadow-xl whitespace-nowrap z-50 border border-[#3f3f3f]">
                {t('privacy.onlyYouCanAccess')}
              </div>

              <ShareModal
                isOpen={isShareModalOpen}
                onClose={() => setIsShareModalOpen(false)}
                buttonPosition={shareButtonPosition}
              />
            </div>

	            <div className="relative group/favorite">
	              <button
	                onClick={handleToggleFavorite}
	                className={`p-1.5 hover:bg-gray-100 dark:hover:bg-[#fffff315] rounded-md transition-colors ${isFavorite ? 'text-[#ca984d]' : 'text-gray-700 dark:text-[#f0efed]'}`}
	              >
	                <Star size={18} fill={isFavorite ? 'currentColor' : 'none'} />
	              </button>

              <div className="absolute top-full right-[-28] mt-2 hidden group-hover/favorite:block bg-[#2f2f2f] text-[#f0efed] text-xs p-2 rounded-md shadow-xl whitespace-nowrap z-50 border border-[#3f3f3f]">
                {isFavorite ? t('favorites.removeFromFavorites') : t('favorites.addToFavorites')}
              </div>
            </div>

	            <div className="relative group/more">
	              <button
	                onClick={() => setIsOptionsModalOpen(!isOptionsModalOpen)}
	                className={`p-1.5 text-gray-700 dark:text-[#f0efed] rounded-md transition-colors ${
	                  isOptionsModalOpen ? 'bg-gray-100 dark:bg-[#fffff315]' : 'hover:bg-gray-100 dark:hover:bg-[#fffff315]'
	                }`}
	              >
	                <MoreHorizontal size={20} />
	              </button>

              <div className="absolute top-full right-0 mt-2 hidden group-hover/more:block bg-[#2f2f2f] text-[#f0efed] text-xs p-2 rounded-md shadow-xl whitespace-nowrap z-50 border border-[#3f3f3f]">
                {t('actions.moreOptionsTooltip')}
              </div>

              <PageOptionsModal
                isOpen={isOptionsModalOpen}
                onClose={() => setIsOptionsModalOpen(false)}
                userName={session?.user?.name || session?.user?.name || session?.user?.email}
                updatedAt={note?.updated_at || note?.updated_at}
                wordCount={wordCount}
                onDelete={handleDeleteNote}
                onCopyPageContents={handleCopyPageContents}
              />
            </div>
          </div>
        </div>

        {note?.is_deleted && (
          <div className="bg-[#eb5757] text-[#f0efed] hover:text-white px-4 py-2 flex items-center justify-center md:justify-between text-sm">
            <div className="hidden md:flex items-center gap-2">
              <span>
                {t('trashBanner.deletedMessage', {
                  user: session?.user?.name || session?.user?.email || t('user.fallbackName'),
                  minutes: getMinutesSinceDeletion(),
                  days: 30,
                })}
              </span>
            </div>
            <div className="flex items-center gap-4">
              <button
                onClick={handleRestore}
                className="flex items-center border border-[#f0efed] hover:border-white px-2 py-1 rounded-md gap-2 font-medium"
              >
                <RotateCcw size={16} />
                {t('trashBanner.restorePage')}
              </button>
              <button
                onClick={() => setIsTrashDeleteConfirmOpen(true)}
                className="flex items-center border border-[#f0efed] hover:border-white px-2 py-1 rounded-md gap-2 font-medium"
              >
                <Trash2 size={16} />
                {t('trashBanner.deleteFromTrash')}
              </button>
            </div>
          </div>
        )}

        <ConfirmationModal
          open={isTrashDeleteConfirmOpen}
          message={t('confirmTrashDelete.message')}
          confirmText={t('confirmTrashDelete.actions.delete')}
          cancelText={t('confirmTrashDelete.actions.cancel')}
          loading={isDeletingFromTrash}
          onClose={() => setIsTrashDeleteConfirmOpen(false)}
          onConfirm={async () => {
            setIsDeletingFromTrash(true);
            try {
              await handlePermanentDelete();
            } finally {
              setIsDeletingFromTrash(false);
              setIsTrashDeleteConfirmOpen(false);
            }
          }}
        />

        <div className="relative md:flex-1 md:overflow-y-auto">
          <div className="max-w-4xl mx-auto px-6 md:px-12 py-6 md:py-12">
            <div className="group relative">
              <textarea
                ref={titleInputRef}
                value={title}
                onChange={handleTitleChange}
                onKeyDown={handleTitleKeyDown}
                placeholder={displayDefaultTitle}
                rows={1}
                className="w-full text-[40px] font-bold text-gray-900 dark:text-gray-100 mb-3 bg-transparent border-none outline-none placeholder:text-gray-300 dark:placeholder:text-[#373737] resize-none overflow-hidden block break-words"
              />
            </div>

            <div className="pb-40 relative">
              <NoteEditor
                key={note.id}
                ref={noteEditorRef}
                initialContent={editorHtml}
                onChange={setEditorHtml}
                onPageCreate={handleCreatePageFromEditor}
                onFocus={() => isMobile && setIsMobileToolbarVisible(true)}
                onBlur={() => {
                  // Small delay to allow clicking buttons in the toolbar before it hides
                  setTimeout(() => setIsMobileToolbarVisible(false), 200);
                }}
                onSelectionChange={(pos) => {
                  if (!isMobile || !pos) return;
                  
                  // Adjust position to be relative to the parent .pb-40 container
                  const parent = document.querySelector('.pb-40.relative');
                  if (parent) {
                    const rect = parent.getBoundingClientRect();
                    setMobileToolbarPosition({
                      top: pos.top - (rect.top + window.scrollY),
                      left: pos.left - (rect.left + window.scrollX)
                    });
                  } else {
                    setMobileToolbarPosition(pos);
                  }
                }}
              />
              {!isMobile ? (
                <FloatingToolbar
                  userName={session?.user?.name || session?.user?.email}
                  updatedAt={note?.updated_at}
                />
              ) : (
                <FloatingMobileToolbar 
                  isVisible={isMobileToolbarVisible} 
                  position={mobileToolbarPosition ?? undefined}
                />
              )}
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
