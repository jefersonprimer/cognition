import { INoteRepository } from "../../../../domain/repositories/INoteRepository";
import { Note } from "../../../../domain/entities/Note";
import { supabase } from "../client";

export class SupabaseNoteRepository implements INoteRepository {
  private normalizeNoteId(id: string): string {
    return id.replace(/-/g, '').toLowerCase();
  }

  private stripChildReferencesFromDescription(
    description: string | null,
    childNoteIds: string[]
  ): string | null {
    if (!description || childNoteIds.length === 0) {
      return description;
    }

    const normalizedIds = new Set(childNoteIds.map((id) => this.normalizeNoteId(id)));
    const lines = description.split('\n');
    const filteredLines = lines.filter((line) => {
      const trimmedLine = line.trim();
      if (!trimmedLine.startsWith('p:')) {
        return true;
      }

      const referenceContent = trimmedLine.slice(2).trim();
      const rawReferenceId = referenceContent.split('|')[0]?.trim();
      if (!rawReferenceId) {
        return true;
      }

      const normalizedReferenceId = this.normalizeNoteId(rawReferenceId);
      return !normalizedIds.has(normalizedReferenceId);
    });

    return filteredLines.join('\n');
  }

  private async removeChildReferenceFromParent(
    childNoteId: string,
    parentId: string | null,
    userId: string
  ): Promise<void> {
    if (!parentId) {
      return;
    }

    const { data: parentData, error: parentError } = await supabase
      .from('notes')
      .select('id, description')
      .match({ id: parentId, user_id: userId })
      .single();

    if (parentError && parentError.code !== 'PGRST116') {
      console.error("Supabase find parent note error:", parentError.message);
      throw new Error("Could not sync parent note references.");
    }

    if (!parentData) {
      return;
    }

    const nextDescription = this.stripChildReferencesFromDescription(parentData.description, [childNoteId]);
    if (nextDescription === parentData.description) {
      return;
    }

    const { error: updateParentError } = await supabase
      .from('notes')
      .update({
        description: nextDescription,
        updated_at: new Date().toISOString(),
      })
      .match({ id: parentId, user_id: userId });

    if (updateParentError) {
      console.error("Supabase update parent note error:", updateParentError.message);
      throw new Error("Could not sync parent note references.");
    }
  }

  async create(noteData: Omit<Note, 'id' | 'createdAt' | 'is_deleted' | 'deleted_at'> & { parentId?: string | null }): Promise<Note> {
    const { userId, title, description, parentId } = noteData;
    const { data, error } = await supabase
      .from('notes')
      .insert({
        user_id: userId,
        title,
        description,
        parent_id: parentId,
        is_deleted: false, 
        is_favorite: false,
      })
      .select()
      .single();

    if (error) {
      console.error("Supabase create note error:", error.message);
      throw new Error("Could not create note.");
    }

    return this.mapToNote(data);
  }

  async findTopLevelByUserId(userId: string): Promise<Note[]> {
    const { data, error } = await supabase
      .from('notes')
      .select('*')
      .eq('user_id', userId)
      .eq('is_deleted', false)
      .is('parent_id', null)
      .order('updated_at', { ascending: false });

    if (error) {
      console.error("Supabase find top-level notes error:", error.message);
      throw new Error("Could not find notes.");
    }

    return data.map(this.mapToNote);
  }

  async findByParentId(parentId: string): Promise<Note[]> {
    const { data, error } = await supabase
      .from('notes')
      .select('*')
      .eq('parent_id', parentId)
      .eq('is_deleted', false)
      .order('updated_at', { ascending: false });

    if (error) {
      console.error("Supabase find child notes error:", error.message);
      throw new Error("Could not find child notes.");
    }

    return data.map(this.mapToNote);
  }

  async findByUserId(userId: string, sortBy: 'created_at' | 'updated_at' = 'updated_at', sortDirection: 'asc' | 'desc' = 'desc'): Promise<Note[]> {
    const { data, error } = await supabase
      .from('notes')
      .select('*')
      .eq('user_id', userId)
      .eq('is_deleted', false)
      .order(sortBy, { ascending: sortDirection === 'asc' });

    if (error) {
      console.error("Supabase find notes error:", error.message);
      throw new Error("Could not find notes.");
    }

    return data.map(this.mapToNote);
  }

  async findById(id: string, userId: string): Promise<Note | null> {
    const { data, error } = await supabase
      .from('notes')
      .select('*')
      .eq('id', id)
      .eq('user_id', userId)
      .single();

    if (error && error.code !== 'PGRST116') { // PGRST116 = no rows found
      console.error("Supabase find note by id error:", error.message);
      throw new Error("Could not find note.");
    }

    if (!data) return null;

    return this.mapToNote(data);
  }

  async update(id: string, userId: string, data: Partial<Pick<Note, 'title' | 'description'>>): Promise<Note | null> {
    const payload = Object.fromEntries(
      Object.entries(data).filter(([, value]) => typeof value !== 'undefined')
    ) as Partial<Pick<Note, 'title' | 'description'>>;

    if (Object.keys(payload).length === 0) {
      throw new Error("No data provided for update.");
    }

    const { data: currentData, error: currentError } = await supabase
      .from('notes')
      .select('*')
      .match({ id, user_id: userId })
      .maybeSingle();

    if (currentError) {
      console.error("Supabase find note before update error:", currentError.message);
      throw new Error("Could not update note.");
    }

    if (!currentData) {
      return null;
    }

    const nextTitle = typeof payload.title === 'undefined' ? currentData.title : payload.title;
    const nextDescription =
      typeof payload.description === 'undefined' ? currentData.description : payload.description;

    if (nextTitle === currentData.title && nextDescription === currentData.description) {
      return this.mapToNote(currentData);
    }

    const updateData = {
      ...payload,
      updated_at: new Date().toISOString(),
    };

    const { data: updatedData, error } = await supabase
      .from('notes')
      .update(updateData)
      .match({ id, user_id: userId })
      .select()
      .single();

    if (error) {
      console.error("Supabase update note error:", error.message);
      throw new Error("Could not update note.");
    }

    return this.mapToNote(updatedData);
  }

  async softDelete(id: string, userId: string): Promise<void> {
    const { data: noteData, error: noteError } = await supabase
      .from('notes')
      .select('id, parent_id')
      .match({ id, user_id: userId })
      .single();

    if (noteError && noteError.code !== 'PGRST116') {
      console.error("Supabase find note for soft delete error:", noteError.message);
      throw new Error("Could not move note to trash.");
    }

    if (noteData) {
      await this.removeChildReferenceFromParent(noteData.id, noteData.parent_id, userId);
    }

    const { error } = await supabase
      .from('notes')
      .update({ is_deleted: true, deleted_at: new Date().toISOString() })
      .match({ id, user_id: userId });

    if (error) {
      console.error("Supabase soft delete error:", error.message);
      throw new Error("Could not move note to trash.");
    }
  }

  async restore(id: string, userId: string): Promise<void> {
    const { error } = await supabase
      .from('notes')
      .update({ is_deleted: false, deleted_at: null })
      .match({ id, user_id: userId });

    if (error) {
      console.error("Supabase restore note error:", error.message);
      throw new Error("Could not restore note.");
    }
  }

  async permanentDelete(id: string, userId: string): Promise<void> {
    const { data: noteData, error: noteError } = await supabase
      .from('notes')
      .select('id, parent_id')
      .match({ id, user_id: userId })
      .single();

    if (noteError && noteError.code !== 'PGRST116') {
      console.error("Supabase find note for permanent delete error:", noteError.message);
      throw new Error("Could not permanently delete note.");
    }

    if (noteData) {
      await this.removeChildReferenceFromParent(noteData.id, noteData.parent_id, userId);
    }

    const { error } = await supabase
      .from('notes')
      .delete()
      .match({ id, user_id: userId, is_deleted: true }); // Extra safety: only delete if it is already in trash

    if (error) {
      console.error("Supabase permanent delete error:", error.message);
      throw new Error("Could not permanently delete note.");
    }
  }

  async findDeletedByUserId(userId: string): Promise<Note[]> {
    const { data, error } = await supabase
      .from('notes')
      .select('*')
      .eq('user_id', userId)
      .eq('is_deleted', true)
      .order('deleted_at', { ascending: false });

    if (error) {
      console.error("Supabase find deleted notes error:", error.message);
      throw new Error("Could not find deleted notes.");
    }

    return data.map(this.mapToNote);
  }

  async search(userId: string, query: string, titleOnly?: boolean, sortBy?: 'created_at' | 'updated_at', sortDirection?: 'asc' | 'desc'): Promise<Note[]> {
    // Use Full Text Search instead of `ilike('%...%')` for scalability.
    // When the DB has a precomputed `search_vector` (GIN indexed), it will be used.
    // Otherwise we fallback to FTS over `title` + `description`.
    const config = 'simple';
    const type: 'websearch' = 'websearch';
    const sanitizedQuery = query
      .trim()
      // Avoid breaking PostgREST filter parsing in the `.or(...)` fallback.
      .replace(/[(),]/g, ' ');

    const baseQuery = supabase
      .from('notes')
      .select('*')
      .eq('user_id', userId)
      .eq('is_deleted', false);

    const applySort = (q: typeof baseQuery) => {
      if (!sortBy) return q;
      return q.order(sortBy, { ascending: sortDirection === 'asc' });
    };

    // Title-only is the simplest case: just filter by `title` FTS.
    if (titleOnly) {
      const { data, error } = await applySort(
        baseQuery.textSearch('title', sanitizedQuery, { config, type })
      );

      if (error) {
        console.error("Supabase search notes error (titleOnly):", error.message);
        throw new Error("Could not perform search.");
      }

      return (data ?? []).map(this.mapToNote);
    }

    // Full search: prefer precomputed weighted `search_vector` (faster with GIN index).
    const tryVector = await applySort(
      baseQuery.textSearch('search_vector', sanitizedQuery, { config, type })
    );
    if (tryVector.error) {
      // Fallback if the schema doesn't have `search_vector` yet.
      const operator = `wfts(${config})`;
      const filter = `title.${operator}.${sanitizedQuery},description.${operator}.${sanitizedQuery}`;

      const { data, error } = await applySort(baseQuery.or(filter));
      if (error) {
        console.error("Supabase search notes error (fallback):", error.message);
        throw new Error("Could not perform search.");
      }

      return (data ?? []).map(this.mapToNote);
    }

    if (!tryVector.data) {
      return [];
    }
    return tryVector.data.map(this.mapToNote);
  }

  async deleteAllByUserId(userId: string): Promise<void> {
    const { error } = await supabase
      .from('notes')
      .delete()
      .eq('user_id', userId);

    if (error) {
      console.error("Supabase delete all notes error:", error.message);
      throw new Error("Could not delete all notes for the user.");
    }
  }

  async emptyTrash(userId: string): Promise<void> {
    const { error } = await supabase.rpc('empty_trash_and_cleanup_references', {
      p_user_id: userId,
    });

    if (error) {
      console.error("Supabase empty trash RPC error:", error.message);
      throw new Error("Could not empty trash.");
    }
  }

  async favorite(id: string, userId: string, isFavorite: boolean): Promise<Note | null> {
    const { data, error } = await supabase
      .from('notes')
      .update({ is_favorite: isFavorite })
      .match({ id, user_id: userId })
      .select()
      .single();

    if (error) {
      console.error("Supabase favorite note error:", error.message);
      throw new Error("Could not favorite note.");
    }

    return this.mapToNote(data);
  }

  async findFavoritesByUserId(userId: string): Promise<Note[]> {
    const { data, error } = await supabase
      .from('notes')
      .select('*')
      .eq('user_id', userId)
      .eq('is_deleted', false)
      .eq('is_favorite', true)
      .order('updated_at', { ascending: false });

    if (error && error.code !== 'PGRST116') { // PGRST116 = no rows found
      console.error("Supabase find favorite notes error:", error.message);
      throw new Error("Could not find favorite notes.");
    }

    if (!data) {
        return [];
    }

    return data.map(this.mapToNote);
  }

  // Helper to map database result to Note entity
  private mapToNote(data: any): Note {
    return {
        id: data.id,
        userId: data.user_id,
        title: data.title,
        description: data.description,
        createdAt: new Date(data.created_at),
        is_deleted: data.is_deleted,
        deleted_at: data.deleted_at ? new Date(data.deleted_at) : null,
        updated_at: new Date(data.updated_at),
        is_favorite: data.is_favorite,
        parentId: data.parent_id,
    };
  }
}
