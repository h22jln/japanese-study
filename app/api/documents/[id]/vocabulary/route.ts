import { NextResponse } from "next/server";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { createAdminSupabaseClient } from "@/lib/supabase/admin";

type DeletePayload = {
  vocabularyId?: string;
};

export async function DELETE(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createServerSupabaseClient();
  if (!supabase) return NextResponse.json({ error: "Supabase is not configured" }, { status: 503 });

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const payload = await request.json().catch(() => null) as DeletePayload | null;
  const vocabularyId = payload?.vocabularyId?.trim();
  if (!vocabularyId) return NextResponse.json({ error: "삭제할 단어가 없습니다." }, { status: 400 });

  const admin = createAdminSupabaseClient();
  const { data: document } = await admin
    .from("documents")
    .select("id")
    .eq("id", id)
    .eq("user_id", user.id)
    .single();

  if (!document) return NextResponse.json({ error: "자료를 찾을 수 없습니다." }, { status: 404 });

  const { error } = await admin
    .from("document_vocabulary")
    .delete()
    .eq("document_id", id)
    .eq("vocabulary_id", vocabularyId)
    .eq("source", "user_lookup");

  if (error) {
    return NextResponse.json({ error: "단어 표시 삭제에 실패했습니다." }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
