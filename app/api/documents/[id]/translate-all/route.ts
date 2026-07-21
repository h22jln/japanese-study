import { NextResponse } from "next/server";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { createAdminSupabaseClient } from "@/lib/supabase/admin";
import { translateJapaneseLine } from "@/lib/ai/translate-line";

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
    .select("id,body_lines,body_line_translations")
    .eq("id", id)
    .eq("user_id", user.id)
    .single();

  if (!document) return NextResponse.json({ error: "자료를 찾을 수 없습니다." }, { status: 404 });

  const lines = Array.isArray(document.body_lines) ? document.body_lines.map(normalizeLine).filter(Boolean) : [];
  if (lines.length === 0) return NextResponse.json({ error: "해석할 본문이 없습니다." }, { status: 400 });

  const cache = document.body_line_translations && typeof document.body_line_translations === "object"
    ? document.body_line_translations as Record<string, string>
    : {};
  const nextCache = { ...cache };

  for (const [index, text] of lines.entries()) {
    const cacheKey = String(index);
    if (nextCache[cacheKey]?.trim()) continue;

    const { data: globalCache } = await admin
      .from("line_translation_cache")
      .select("translation_ko")
      .eq("source_text", text)
      .maybeSingle();

    if (globalCache?.translation_ko?.trim()) {
      nextCache[cacheKey] = globalCache.translation_ko;
      continue;
    }

    const translation = await translateJapaneseLine(text);
    nextCache[cacheKey] = translation;
    await admin.from("line_translation_cache").upsert({
      source_text: text,
      translation_ko: translation,
      updated_at: new Date().toISOString(),
    });
  }

  await admin.from("documents").update({ body_line_translations: nextCache }).eq("id", id).eq("user_id", user.id);
  return NextResponse.json({ translations: nextCache });
}
