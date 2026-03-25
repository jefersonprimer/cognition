import Dexie, { type Table } from 'dexie';

export type NoteDraft = {
  /**
   * Chave primária (string) para evitar consultas compostas e manter o schema simples.
   * Formato: `${userId}:${noteId}`
   */
  key: string;
  userId: string;
  noteId: string;
  title: string;
  description: string; // HTML do editor (Tiptap)
  updatedAt: number; // Date.now()
};

const isBrowser = typeof window !== 'undefined';

class DraftDB extends Dexie {
  drafts!: Table<NoteDraft, string>;

  constructor() {
    super('cognitionNoteDraftDB');
    // `&key` = primary key
    this.version(1).stores({
      drafts: '&key, userId, noteId, updatedAt',
    });
  }
}

let db: DraftDB | null = null;

function ensureDb(): DraftDB {
  if (!isBrowser) {
    throw new Error('DraftDB can only be used in the browser.');
  }
  if (!db) db = new DraftDB();
  return db;
}

function makeKey(userId: string, noteId: string) {
  return `${userId}:${noteId}`;
}

export async function upsertNoteDraft(
  userId: string,
  noteId: string,
  title: string,
  description: string
): Promise<void> {
  const next: NoteDraft = {
    key: makeKey(userId, noteId),
    userId,
    noteId,
    title,
    description,
    updatedAt: Date.now(),
  };
  await ensureDb().drafts.put(next);
}

export async function getNoteDraft(userId: string, noteId: string): Promise<NoteDraft | null> {
  const key = makeKey(userId, noteId);
  return ensureDb().drafts.get(key);
}

export async function clearNoteDraft(userId: string, noteId: string): Promise<void> {
  const key = makeKey(userId, noteId);
  await ensureDb().drafts.delete(key);
}

