'use client'
import React, { useEffect, useState } from 'react';
import { Trash2, RotateCcw, FileText, File, X } from 'lucide-react';
import { useTranslations } from 'next-intl';
import Link from 'next/link';
import api from '@/lib/api';
import { Note } from '@/types/note';
import { useNote } from '@/context/NoteContext';
import { createNoteSlug } from '@/lib/utils';
import ConfirmationModal from '@/components/ConfirmationModal';

type Props = {
  open: boolean;
  onClose: () => void;
};

type ConfirmAction =
  | { type: 'deleteNote'; id: string }
  | { type: 'emptyTrash' };

export default function TrashModal({ open, onClose }: Props) {
  const t = useTranslations('TrashModal');
  const { updatedTitles, updatedHasContent } = useNote();
  const [notes, setNotes] = useState<Note[]>([]);
  const [loading, setLoading] = useState(false);
  const [confirmAction, setConfirmAction] = useState<ConfirmAction | null>(null);
  const [deleting, setDeleting] = useState(false);
  const defaultNoteTitle = 'Nova página';

  useEffect(() => {
    if (open) {
      fetchDeletedNotes();
    }
  }, [open]);

  useEffect(() => {
    if (!open) {
      setConfirmAction(null);
    }
  }, [open]);

  // Handle escape key
  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      if (e.key !== 'Escape') return;
      if (confirmAction) setConfirmAction(null);
      else onClose();
    }
    if (open) window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [open, onClose, confirmAction]);

  const fetchDeletedNotes = async () => {
    setLoading(true);
    try {
      const response = await api.get('/notes/trash');
      setNotes(response.data);
    } catch (error) {
      console.error('Failed to fetch deleted notes:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleRestore = async (id: string) => {
    try {
      // PATCH to /notes/trash/[id] handles restore
      await api.patch(`/notes/trash/${id}`);
      setNotes(prev => prev.filter(n => n.id !== id));
      // Optionally trigger a global refresh of notes if needed, 
      // but usually the sidebar handles its own state or refetches on navigation.
      // If the user is currently viewing the parent of the restored note, they might need a refresh.
      // For now, we just remove from trash list.
    } catch (error) {
      console.error('Failed to restore note:', error);
    }
  };

  const handlePermanentDelete = async (id: string) => {
    setDeleting(true);
    try {
      await api.delete(`/notes/trash/${id}`);
      setNotes(prev => prev.filter(n => n.id !== id));
    } catch (error) {
      console.error('Failed to permanently delete note:', error);
    } finally {
      setDeleting(false);
    }
  };

  const handleEmptyTrash = async () => {
    setDeleting(true);
    try {
      await api.delete('/notes/trash');
      setNotes([]);
    } catch (error) {
      console.error('Failed to empty trash:', error);
    } finally {
      setDeleting(false);
    }
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 pointer-events-none">
      <div 
        className="absolute inset-0 pointer-events-auto" 
        onClick={onClose}
      />
      
      {/* Modal Container: Full-screen on mobile, floating on desktop */}
      <div className="absolute inset-0 md:inset-auto md:bottom-2 md:left-55 pointer-events-auto w-full h-full md:w-103.5 md:h-81.75 bg-white md:border border-gray-200 md:rounded-lg shadow-2xl flex flex-col overflow-hidden text-gray-600 dark:bg-[#252525] dark:border-[#3f3f3f] dark:text-[#9b9b9b]">
        {/* Header */}
        <div className="flex items-center justify-between px-3 py-2 border-b border-gray-200 bg-gray-50 text-gray-900 shrink-0 dark:border-[#3f3f3f] dark:bg-[#2f2f2f] dark:text-white">
          <span className="text-sm font-medium flex items-center gap-2">
            <Trash2 size={16} />
            {t('title')}
          </span>
          <div className="flex items-center gap-2">
            {notes.length > 0 && (
              <button 
                onClick={() => setConfirmAction({ type: 'emptyTrash' })}
                className="text-xs text-red-600 hover:text-red-700 px-2 py-1 rounded hover:bg-gray-100 transition-colors dark:text-[#ff5f5f] dark:hover:text-[#ff8f8f] dark:hover:bg-[#3f3f3f]"
              >
                {t('actions.emptyTrashNow')}
              </button>
            )}
          </div>
          <button 
            onClick={onClose}
            className="p-2 flex md:hidden"
          >
              <X size={16}/>
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-2 space-y-1">
          {loading ? (
            <div className="flex items-center justify-center h-full text-xs">{t('states.loading')}</div>
          ) : notes.length === 0 ? (
            <div className="flex items-center justify-center h-full text-xs text-center px-4">
              {t('states.empty')}
            </div>
          ) : (
            notes.map(note => (
              <div 
                key={note.id} 
                className="group flex items-center justify-between px-2 py-1.5 rounded-md hover:bg-gray-100 text-gray-900 transition-colors dark:hover:bg-[#2f2f2f] dark:text-[#f0efed]"
              >
                <Link 
                  href={`/${createNoteSlug((updatedTitles[note.id] !== undefined ? updatedTitles[note.id] : note.title) || t('defaultNoteTitle'), note.id)}`}
                  onClick={onClose}
                  className="flex items-center gap-1 overflow-hidden flex-1"
                >
                  { (updatedHasContent[note.id] !== undefined 
                      ? updatedHasContent[note.id] 
                      : (note.title && note.title !== defaultNoteTitle && note.title.trim() !== '' && note.description && note.description.trim() !== '')) ? (
                    <FileText size={18} className="shrink-0" />
                  ) : (
                    <File size={18} className="shrink-0" />
                  )}
                  <span className="text-sm truncate">
                    {(updatedTitles[note.id] !== undefined ? updatedTitles[note.id] : note.title) || t('defaultNoteTitle')}
                  </span>
                </Link>
                
                <div className="flex items-center gap-1 shrink-0">
                  <button 
                    onClick={() => handleRestore(note.id)}
                    className="p-1 hover:bg-gray-200 rounded text-gray-600 hover:text-gray-900 dark:hover:bg-[#3f3f3f] dark:text-[#ada9a3] dark:hover:text-white"
                    title={t('actions.restore')}
                  >
                    <RotateCcw size={16} />
                  </button>
                  <button 
                    onClick={() => setConfirmAction({ type: 'deleteNote', id: note.id })}
                    className="p-1 hover:bg-gray-200 rounded text-gray-600 hover:text-red-700 dark:hover:bg-[#3f3f3f] dark:text-[#ada9a3] dark:hover:text-[#ff8f8f]"
                    title={t('actions.deletePermanently')}
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
      <ConfirmationModal
        open={confirmAction !== null}
        message={confirmAction?.type === 'emptyTrash' ? t('confirmEmptyTrash.message') : t('confirmDelete.message')}
        confirmText={t('confirmDelete.actions.delete')}
        cancelText={t('confirmDelete.actions.cancel')}
        loading={deleting}
        onClose={() => setConfirmAction(null)}
        onConfirm={async () => {
          if (!confirmAction) return;
          if (confirmAction.type === 'emptyTrash') {
            await handleEmptyTrash();
            setConfirmAction(null);
            return;
          }
          await handlePermanentDelete(confirmAction.id);
          setConfirmAction(null);
        }}
      />
    </div>
  );
}
