/**
 * Notes store — local-first note management with Zustand.
 * Operates on the local SQLite database and queues changes for sync.
 */

import { create } from 'zustand';

// ── Types ────────────────────────────────────────────────────────────

export interface Note {
  id: string;
  ownerId: string;
  title: string;
  contentPreview: string;
  color: string;
  isPinned: boolean;
  isArchived: boolean;
  isLocked: boolean;
  isShared: boolean;
  version: number;
  createdAt: string;
  updatedAt: string;
  deletedAt: string | null;
}

export interface NotesFilter {
  search: string;
  archived: boolean;
  pinnedOnly: boolean;
}

interface NotesState {
  // State
  notes: Note[];
  selectedNote: Note | null;
  filter: NotesFilter;
  isLoading: boolean;
  error: string | null;
  totalCount: number;

  // Actions
  setNotes: (notes: Note[]) => void;
  addNote: (note: Note) => void;
  updateNote: (id: string, updates: Partial<Note>) => void;
  removeNote: (id: string) => void;
  setSelectedNote: (note: Note | null) => void;
  setFilter: (filter: Partial<NotesFilter>) => void;
  setLoading: (loading: boolean) => void;
  setError: (error: string | null) => void;
}

// ── Store ────────────────────────────────────────────────────────────

export const useNotesStore = create<NotesState>((set, get) => ({
  notes: [],
  selectedNote: null,
  filter: {
    search: '',
    archived: false,
    pinnedOnly: false,
  },
  isLoading: false,
  error: null,
  totalCount: 0,

  setNotes: (notes) =>
    set({
      notes: notes.sort((a, b) => {
        // Pinned first, then by updatedAt desc
        if (a.isPinned !== b.isPinned) return a.isPinned ? -1 : 1;
        return new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime();
      }),
      totalCount: notes.length,
    }),

  addNote: (note) =>
    set((state) => ({
      notes: [note, ...state.notes],
      totalCount: state.totalCount + 1,
    })),

  updateNote: (id, updates) =>
    set((state) => ({
      notes: state.notes.map((n) =>
        n.id === id ? { ...n, ...updates, updatedAt: new Date().toISOString() } : n
      ),
      selectedNote:
        state.selectedNote?.id === id
          ? { ...state.selectedNote, ...updates }
          : state.selectedNote,
    })),

  removeNote: (id) =>
    set((state) => ({
      notes: state.notes.filter((n) => n.id !== id),
      totalCount: state.totalCount - 1,
      selectedNote: state.selectedNote?.id === id ? null : state.selectedNote,
    })),

  setSelectedNote: (note) => set({ selectedNote: note }),

  setFilter: (filter) =>
    set((state) => ({
      filter: { ...state.filter, ...filter },
    })),

  setLoading: (loading) => set({ isLoading: loading }),
  setError: (error) => set({ error }),
}));
