import { NextResponse } from "next/server";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { createAdminSupabaseClient } from "@/lib/supabase/admin";
import { summarizeJapaneseDocument } from "@/lib/ai/summarize-document";

function normalizeLine(line: unknown) {
  if (typeof line === "string") return line.trim();
  if (line && typeof line === "object" && "japanese" in line && typeof line.japanese === "string") return line.japanese.trim();
  return "";
}

export async function POST(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createServerSupabaseClient();
  if (!supabase) return NextResponse.json({ error: "Supabase is not configured" }, { status: 503 });

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const admin = createAdminSupabaseClient();
  const { data: document } = await admin
    .from("documents")
    .select("id,body_lines,summary_ko")
    .eq("id", id)
    .eq("user_id", user.id)
    .single();

  if (!document) return NextResponse.json({ error: "자료를 찾을 수 없습니다." }, { status: 404 });
  if (document.summary_ko?.trim()) return NextResponse.json({ summary: document.summary_ko });

  const lines = Array.isArray(document.body_lines) ? document.body_lines.map(normalizeLine).filter(Boolean) : [];
  if (lines.length === 0) return NextResponse.json({ error: "요약할 본문이 없습니다." }, { status: 400 });

  const summary = await summarizeJapaneseDocument(lines);
  await admin.from("documents").update({ summary_ko: summary }).eq("id", id).eq("user_id", user.id);

  return NextResponse.json({ summary });
}
