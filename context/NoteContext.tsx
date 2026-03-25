'use client';

import { ReactNode } from 'react';
import { create } from 'zustand';

type NoteUIState = {
  title?: string;
  hasContent?: boolean;
};

interface NoteStore {
  notes: Record<string, NoteUIState>;
  updateNoteTitle: (id: string, title: string) => void;
  updateNoteHasContent: (id: string, hasContent: boolean) => void;
}

const useNoteStore = create<NoteStore>((set) => ({
  notes: {},
  updateNoteTitle: (id, title) =>
    set((state) => {
      if (state.notes[id]?.title === title) {
        return state;
      }

      return {
        notes: {
          ...state.notes,
          [id]: {
            ...state.notes[id],
            title,
          },
        },
      };
    }),
  updateNoteHasContent: (id, hasContent) =>
    set((state) => {
      if (state.notes[id]?.hasContent === hasContent) {
        return state;
      }

      return {
        notes: {
          ...state.notes,
          [id]: {
            ...state.notes[id],
            hasContent,
          },
        },
      };
    }),
}));

export function NoteProvider({ children }: { children: ReactNode }) {
  return <>{children}</>;
}

export function useNoteTitle(noteId?: string | null) {
  return useNoteStore((state) => (noteId ? state.notes[noteId]?.title : undefined));
}

export function useNoteHasContent(noteId?: string | null) {
  return useNoteStore((state) => (noteId ? state.notes[noteId]?.hasContent : undefined));
}

export function useNoteActions() {
  const updateNoteTitle = useNoteStore((state) => state.updateNoteTitle);
  const updateNoteHasContent = useNoteStore((state) => state.updateNoteHasContent);

  return {
    updateNoteTitle,
    updateNoteHasContent,
  };
}
