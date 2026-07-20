import { NextResponse } from "next/server";
import { createServerSupabaseClient } from "@/lib/supabase/server";

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createServerSupabaseClient();
  if (!supabase) return NextResponse.json({ error: "Supabase is not configured" }, { status: 503 });

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const payload = await request.json().catch(() => null) as { title?: string; pinned?: boolean } | null;

  const updates: { title?: string; pinned_at?: string | null } = {};
  if (typeof payload?.title === "string") {
    const title = payload.title.trim().slice(0, 200);
    if (!title) return NextResponse.json({ error: "제목을 입력해주세요." }, { status: 400 });
    updates.title = title;
  }

  if (typeof payload?.pinned === "boolean") {
    updates.pinned_at = payload.pinned ? new Date().toISOString() : null;
  }

  if (Object.keys(updates).length === 0) {
    return NextResponse.json({ error: "변경할 값이 없습니다." }, { status: 400 });
  }

  const { data, error } = await supabase
    .from("documents")
    .update(updates)
    .eq("id", id)
    .eq("user_id", user.id)
    .select("id,title,pinned_at")
    .single();

  if (error || !data) return NextResponse.json({ error: "자료를 찾을 수 없습니다." }, { status: 404 });
  return NextResponse.json(data);
}

export async function DELETE(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createServerSupabaseClient();
  if (!supabase) return NextResponse.json({ error: "Supabase is not configured" }, { status: 503 });

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { data: document, error: findError } = await supabase
    .from("documents")
    .select("id,file_path")
    .eq("id", id)
    .eq("user_id", user.id)
    .single();

  if (findError || !document) {
    return NextResponse.json({ error: "자료를 찾을 수 없습니다." }, { status: 404 });
  }

  const { error: deleteError } = await supabase
    .from("documents")
    .delete()
    .eq("id", id)
    .eq("user_id", user.id);

  if (deleteError) {
    return NextResponse.json({ error: "자료 삭제에 실패했습니다." }, { status: 500 });
  }

  if (document.file_path) {
    await supabase.storage.from("documents").remove([document.file_path]);
  }

  return NextResponse.json({ ok: true });
}
