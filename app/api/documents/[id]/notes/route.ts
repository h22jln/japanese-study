import { NextResponse } from "next/server";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { createAdminSupabaseClient } from "@/lib/supabase/admin";

type CreatePayload = {
  lineIndex?: number;
  selectedText?: string;
  noteText?: string;
  startOffset?: number | null;
  endOffset?: number | null;
};

type DeletePayload = {
  noteId?: string;
};

export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createServerSupabaseClient();
  if (!supabase) return NextResponse.json({ error: "Supabase is not configured" }, { status: 503 });

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { data, error } = await supabase
    .from("document_notes")
    .select("id,line_index,selected_text,note_text,start_offset,end_offset,created_at,updated_at")
    .eq("document_id", id)
    .eq("user_id", user.id)
    .order("line_index")
    .order("created_at");

  if (error) return NextResponse.json({ error: "메모를 불러오지 못했습니다." }, { status: 500 });
  return NextResponse.json({ notes: data ?? [] });
}

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createServerSupabaseClient();
  if (!supabase) return NextResponse.json({ error: "Supabase is not configured" }, { status: 503 });

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const payload = await request.json().catch(() => null) as CreatePayload | null;
  const lineIndex = typeof payload?.lineIndex === "number" ? payload.lineIndex : -1;
  const selectedText = payload?.selectedText?.trim().slice(0, 500);
  const noteText = payload?.noteText?.trim().slice(0, 2000);
  const startOffset = typeof payload?.startOffset === "number" ? payload.startOffset : null;
  const endOffset = typeof payload?.endOffset === "number" ? payload.endOffset : null;

  if (lineIndex < 0 || !selectedText || !noteText) {
    return NextResponse.json({ error: "메모 내용이 올바르지 않습니다." }, { status: 400 });
  }

  const admin = createAdminSupabaseClient();
  const { data: document } = await admin
    .from("documents")
    .select("id")
    .eq("id", id)
    .eq("user_id", user.id)
    .single();

  if (!document) return NextResponse.json({ error: "자료를 찾을 수 없습니다." }, { status: 404 });

  const { data, error } = await admin
    .from("document_notes")
    .insert({
      user_id: user.id,
      document_id: id,
      line_index: lineIndex,
      selected_text: selectedText,
      note_text: noteText,
      start_offset: startOffset,
      end_offset: endOffset,
    })
    .select("id,line_index,selected_text,note_text,start_offset,end_offset,created_at,updated_at")
    .single();

  if (error || !data) return NextResponse.json({ error: "메모 저장에 실패했습니다." }, { status: 500 });
  return NextResponse.json({ note: data });
}

export async function DELETE(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createServerSupabaseClient();
  if (!supabase) return NextResponse.json({ error: "Supabase is not configured" }, { status: 503 });

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const payload = await request.json().catch(() => null) as DeletePayload | null;
  const noteId = payload?.noteId?.trim();
  if (!noteId) return NextResponse.json({ error: "삭제할 메모가 없습니다." }, { status: 400 });

  const admin = createAdminSupabaseClient();
  const { error } = await admin
    .from("document_notes")
    .delete()
    .eq("id", noteId)
    .eq("document_id", id)
    .eq("user_id", user.id);

  if (error) return NextResponse.json({ error: "메모 삭제에 실패했습니다." }, { status: 500 });
  return NextResponse.json({ ok: true });
}
