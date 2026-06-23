/**
 * Local SQLite database manager.
 * Uses expo-sqlite for local-first data persistence.
 */

import * as SQLite from 'expo-sqlite';

// ── Database Instance ────────────────────────────────────────────────

let db: SQLite.SQLiteDatabase | null = null;

export async function getDatabase(): Promise<SQLite.SQLiteDatabase> {
  if (!db) {
    db = await SQLite.openDatabaseAsync('notesapp.db');
    await initializeSchema(db);
  }
  return db;
}

// ── Schema ───────────────────────────────────────────────────────────

async function initializeSchema(database: SQLite.SQLiteDatabase) {
  await database.execAsync(`
    PRAGMA journal_mode = WAL;
    PRAGMA foreign_keys = ON;

    -- Notes table
    CREATE TABLE IF NOT EXISTS notes (
      id TEXT PRIMARY KEY,
      owner_id TEXT NOT NULL,
      title TEXT NOT NULL DEFAULT '',
      content_preview TEXT NOT NULL DEFAULT '',
      color TEXT NOT NULL DEFAULT '#FFFFFF',
      is_pinned INTEGER NOT NULL DEFAULT 0,
      is_archived INTEGER NOT NULL DEFAULT 0,
      is_locked INTEGER NOT NULL DEFAULT 0,
      is_shared INTEGER NOT NULL DEFAULT 0,
      version INTEGER NOT NULL DEFAULT 1,
      ydoc_state BLOB,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL,
      deleted_at TEXT
    );

    -- Full-text search index
    CREATE VIRTUAL TABLE IF NOT EXISTS notes_fts USING fts5(
      title,
      content_preview,
      content='notes',
      content_rowid='rowid'
    );

    -- Trigger to keep FTS in sync
    CREATE TRIGGER IF NOT EXISTS notes_ai AFTER INSERT ON notes BEGIN
      INSERT INTO notes_fts(rowid, title, content_preview)
      VALUES (new.rowid, new.title, new.content_preview);
    END;

    CREATE TRIGGER IF NOT EXISTS notes_ad AFTER DELETE ON notes BEGIN
      INSERT INTO notes_fts(notes_fts, rowid, title, content_preview)
      VALUES('delete', old.rowid, old.title, old.content_preview);
    END;

    CREATE TRIGGER IF NOT EXISTS notes_au AFTER UPDATE ON notes BEGIN
      INSERT INTO notes_fts(notes_fts, rowid, title, content_preview)
      VALUES('delete', old.rowid, old.title, old.content_preview);
      INSERT INTO notes_fts(rowid, title, content_preview)
      VALUES (new.rowid, new.title, new.content_preview);
    END;

    -- Indexes for notes
    CREATE INDEX IF NOT EXISTS idx_notes_owner
      ON notes(owner_id);
    CREATE INDEX IF NOT EXISTS idx_notes_updated
      ON notes(updated_at DESC);
    CREATE INDEX IF NOT EXISTS idx_notes_pinned
      ON notes(is_pinned DESC, updated_at DESC);
  `);

  // Migrate any existing default 'Untitled' notes to empty title
  await database.execAsync("UPDATE notes SET title = '' WHERE title = 'Untitled';");
}

// ── Note CRUD ────────────────────────────────────────────────────────

export async function insertNote(note: {
  id: string;
  ownerId: string;
  title: string;
  contentPreview: string;
  color: string;
  ydocState?: Uint8Array;
}) {
  const database = await getDatabase();
  const now = new Date().toISOString();

  await database.runAsync(
    `INSERT INTO notes (id, owner_id, title, content_preview, color, ydoc_state, created_at, updated_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      note.id,
      note.ownerId,
      note.title,
      note.contentPreview,
      note.color,
      note.ydocState ? Buffer.from(note.ydocState) : null,
      now,
      now,
    ]
  );
}

export async function updateNoteField(
  noteId: string,
  field: string,
  value: unknown
) {
  const database = await getDatabase();
  const now = new Date().toISOString();

  await database.runAsync(
    `UPDATE notes SET ${field} = ?, updated_at = ?, version = version + 1
     WHERE id = ?`,
    [value as any, now, noteId]
  );
}

export async function getNoteById(noteId: string) {
  const database = await getDatabase();
  return database.getFirstAsync<any>('SELECT * FROM notes WHERE id = ?', [
    noteId,
  ]);
}

export async function getAllNotes(options?: {
  search?: string;
  archived?: boolean;
  deleted?: boolean;
  limit?: number;
  offset?: number;
}) {
  const database = await getDatabase();
  let query = options?.deleted 
    ? 'SELECT * FROM notes WHERE deleted_at IS NOT NULL'
    : 'SELECT * FROM notes WHERE deleted_at IS NULL';
  const params: any[] = [];

  if (options?.archived !== undefined) {
    query += ' AND is_archived = ?';
    params.push(options.archived ? 1 : 0);
  }

  if (options?.search) {
    // Use FTS5 for fast search
    query = `
      SELECT notes.* FROM notes
      JOIN notes_fts ON notes.rowid = notes_fts.rowid
      WHERE notes.deleted_at ${options.deleted ? 'IS NOT NULL' : 'IS NULL'}
      AND notes_fts MATCH ?
    `;
    params.length = 0; // Reset params
    params.push(options.search);

    if (options?.archived !== undefined) {
      query += ' AND notes.is_archived = ?';
      params.push(options.archived ? 1 : 0);
    }
  }

  query += ' ORDER BY is_pinned DESC, updated_at DESC';

  if (options?.limit) {
    query += ' LIMIT ?';
    params.push(options.limit);
  }
  if (options?.offset) {
    query += ' OFFSET ?';
    params.push(options.offset);
  }

  return database.getAllAsync<any>(query, params);
}

export async function softDeleteNote(noteId: string) {
  const database = await getDatabase();
  const now = new Date().toISOString();
  await database.runAsync(
    'UPDATE notes SET deleted_at = ? WHERE id = ?',
    [now, noteId]
  );
}

export async function hardDeleteNote(noteId: string) {
  const database = await getDatabase();
  await database.runAsync('DELETE FROM notes WHERE id = ?', [noteId]);
}

export async function restoreNote(noteId: string) {
  const database = await getDatabase();
  await database.runAsync(
    'UPDATE notes SET deleted_at = NULL, version = version + 1 WHERE id = ?',
    [noteId]
  );
}

export async function updateYDocState(
  noteId: string,
  state: Uint8Array,
  preview: string
) {
  const database = await getDatabase();
  const now = new Date().toISOString();
  await database.runAsync(
    `UPDATE notes SET ydoc_state = ?, content_preview = ?, updated_at = ?,
     version = version + 1 WHERE id = ?`,
    [Buffer.from(state), preview, now, noteId]
  );
}


