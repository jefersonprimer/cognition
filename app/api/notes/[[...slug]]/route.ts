import { NextRequest, NextResponse } from 'next/server';
import { 
  listNotesUseCase, 
  createNoteUseCase, 
  searchNotesUseCase, 
  listFavoriteNotesUseCase,
  getNoteByIdUseCase,
  updateNoteUseCase,
  softDeleteNoteUseCase,
  favoriteNoteUseCase,
  listChildNotesUseCase,
  listDeletedNotesUseCase,
  permanentDeleteNoteUseCase,
  restoreNoteUseCase,
  duplicateNoteUseCase,
  emptyTrashUseCase
} from '@/server/main/factories/noteFactory';
import { getUserId } from '@/lib/auth';

type Params = Promise<{ slug?: string[] }>;

export async function GET(req: NextRequest, { params }: { params: Params }) {
  const userId = getUserId(req);
  if (!userId) return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });

  const { slug } = await params;
  const { searchParams } = new URL(req.url);

  try {
    // GET /api/notes
    if (!slug || slug.length === 0) {
      const search = searchParams.get('search');
      const favorites = searchParams.get('favorites');

      if (search) {
        const notes = await searchNotesUseCase.execute({ userId, query: search });
        return NextResponse.json(notes);
      }
      if (favorites === 'true') {
        const notes = await listFavoriteNotesUseCase.execute(userId);
        return NextResponse.json(notes);
      }
      const notes = await listNotesUseCase.execute(userId);
      return NextResponse.json(notes);
    }

    // GET /api/notes/search
    if (slug && slug[0] === 'search') {
      const query = searchParams.get('q') || '';
      const titleOnly = searchParams.get('titleOnly') === 'true';
      const sortBy = searchParams.get('sortBy') as any;
      const sortDirection = searchParams.get('sortDirection') as any;

      const notes = await searchNotesUseCase.execute({ 
        userId, 
        query, 
        titleOnly, 
        sortBy, 
        sortDirection 
      });
      return NextResponse.json(notes);
    }

    // GET /api/notes/trash
    if (slug && slug[0] === 'trash' && slug.length === 1) {
      const notes = await listDeletedNotesUseCase.execute(userId);
      return NextResponse.json(notes);
    }

    // GET /api/notes/[id]/children
    if (slug && slug.length === 2 && slug[1] === 'children') {
      const id = slug[0];
      const notes = await listChildNotesUseCase.execute(id);
      return NextResponse.json(notes);
    }

    // GET /api/notes/[id]
    if (slug && slug.length === 1) {
      const id = slug[0];
      const note = await getNoteByIdUseCase.execute({ id, userId });
      if (!note) return NextResponse.json({ message: 'Note not found' }, { status: 404 });
      return NextResponse.json(note);
    }

    return NextResponse.json({ message: 'Not Found' }, { status: 404 });
  } catch (error: any) {
    return NextResponse.json({ message: error.message }, { status: 400 });
  }
}

export async function POST(req: NextRequest, { params }: { params: Params }) {
  const userId = getUserId(req);
  if (!userId) return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });

  const { slug } = await params;

  try {
    // POST /api/notes
    if (!slug || slug.length === 0) {
      const body = await req.json();
      const { title, description, parentId } = body;
      const note = await createNoteUseCase.execute({ userId, title, description, parentId });
      return NextResponse.json(note, { status: 201 });
    }

    // POST /api/notes/[id]/duplicate
    if (slug && slug.length === 2 && slug[1] === 'duplicate') {
      const id = slug[0];
      const note = await duplicateNoteUseCase.execute({ id, userId });
      return NextResponse.json(note, { status: 201 });
    }

    // POST /api/notes/[id]/restore
    if (slug && slug.length === 2 && slug[1] === 'restore') {
      const id = slug[0];
      await restoreNoteUseCase.execute({ id, userId });
      return new Response(null, { status: 200 });
    }

    return NextResponse.json({ message: 'Not Found' }, { status: 404 });
  } catch (error: any) {
    return NextResponse.json({ message: error.message }, { status: 400 });
  }
}

export async function PUT(req: NextRequest, { params }: { params: Params }) {
  const userId = getUserId(req);
  if (!userId) return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });

  const { slug } = await params;

  try {
    // PUT /api/notes/[id]
    if (slug && slug.length === 1) {
      const id = slug[0];
      const body = await req.json();
      const { title, description } = body;
      const data = {
        ...(typeof title !== 'undefined' ? { title } : {}),
        ...(typeof description !== 'undefined' ? { description } : {}),
      };
      const note = await updateNoteUseCase.execute({ id, userId, data });
      if (!note) return NextResponse.json({ message: 'Note not found' }, { status: 404 });
      return NextResponse.json(note);
    }

    return NextResponse.json({ message: 'Not Found' }, { status: 404 });
  } catch (error: any) {
    return NextResponse.json({ message: error.message }, { status: 400 });
  }
}

export async function PATCH(req: NextRequest, { params }: { params: Params }) {
  const userId = getUserId(req);
  if (!userId) return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });

  const { slug } = await params;

  try {
    // PATCH /api/notes/trash/[id] (Restore)
    if (slug && slug.length === 2 && slug[0] === 'trash') {
      const id = slug[1];
      await restoreNoteUseCase.execute({ id, userId });
      return new Response(null, { status: 200 });
    }

    // PATCH /api/notes/[id] (Favorite)
    if (slug && slug.length === 1) {
      const id = slug[0];
      const body = await req.json();
      if (typeof body.is_favorite !== 'undefined') {
        const note = await favoriteNoteUseCase.execute({ id, userId, isFavorite: body.is_favorite });
        if (!note) return NextResponse.json({ message: 'Note not found or could not update' }, { status: 404 });
        return NextResponse.json(note);
      }
    }

    return NextResponse.json({ message: 'Not Found' }, { status: 404 });
  } catch (error: any) {
    return NextResponse.json({ message: error.message }, { status: 400 });
  }
}

export async function DELETE(req: NextRequest, { params }: { params: Params }) {
  const userId = getUserId(req);
  if (!userId) return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });

  const { slug } = await params;

  try {
    // DELETE /api/notes/trash
    if (slug && slug.length === 1 && slug[0] === 'trash') {
      await emptyTrashUseCase.execute(userId);
      return new Response(null, { status: 204 });
    }

    // DELETE /api/notes/[id]/permanent (Permanent Delete)
    if (slug && slug.length === 2 && slug[1] === 'permanent') {
      const id = slug[0];
      await permanentDeleteNoteUseCase.execute({ id, userId });
      return new Response(null, { status: 204 });
    }

    // DELETE /api/notes/trash/[id] (Permanent Delete)
    if (slug && slug.length === 2 && slug[0] === 'trash') {
      const id = slug[1];
      await permanentDeleteNoteUseCase.execute({ id, userId });
      return new Response(null, { status: 204 });
    }

    // DELETE /api/notes/[id] (Soft Delete)
    if (slug && slug.length === 1) {
      const id = slug[0];
      await softDeleteNoteUseCase.execute({ id, userId });
      return new Response(null, { status: 204 });
    }

    return NextResponse.json({ message: 'Not Found' }, { status: 404 });
  } catch (error: any) {
    return NextResponse.json({ message: error.message }, { status: 400 });
  }
}
