import { NextResponse } from "next/server";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { createAdminSupabaseClient } from "@/lib/supabase/admin";
import { translateJapaneseLine } from "@/lib/ai/translate-line";

type RequestPayload = {
  index?: number;
  text?: string;
};

function normalizeLine(line: unknown) {
  if (typeof line === "string") return line.trim();
  if (line && typeof line === "object" && "japanese" in line && typeof line.japanese === "string") return line.japanese.trim();
  return "";
}

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createServerSupabaseClient();
  if (!supabase) return NextResponse.json({ error: "Supabase is not configured" }, { status: 503 });

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const payload = await request.json().catch(() => null) as RequestPayload | null;
  const index = typeof payload?.index === "number" ? payload.index : -1;
  const text = payload?.text?.trim();
  if (index < 0 || !text) return NextResponse.json({ error: "잘못된 요청입니다." }, { status: 400 });

  const admin = createAdminSupabaseClient();
  const { data: document } = await admin
    .from("documents")
    .select("id,body_lines,body_line_translations")
    .eq("id", id)
    .eq("user_id", user.id)
    .single();

  if (!document) return NextResponse.json({ error: "자료를 찾을 수 없습니다." }, { status: 404 });

  const lines = Array.isArray(document.body_lines) ? document.body_lines : [];
  const lineText = normalizeLine(lines[index]);
  if (!lineText || lineText !== text) return NextResponse.json({ error: "본문 줄 정보를 찾을 수 없습니다." }, { status: 404 });

  const cache = document.body_line_translations && typeof document.body_line_translations === "object"
    ? document.body_line_translations as Record<string, string>
    : {};

  const cacheKey = String(index);
  if (cache[cacheKey]?.trim()) return NextResponse.json({ translation: cache[cacheKey] });

  const { data: globalCache } = await admin
    .from("line_translation_cache")
    .select("translation_ko")
    .eq("source_text", text)
    .maybeSingle();

  if (globalCache?.translation_ko?.trim()) {
    const nextCache = { ...cache, [cacheKey]: globalCache.translation_ko };
    await admin.from("documents").update({ body_line_translations: nextCache }).eq("id", id).eq("user_id", user.id);
    return NextResponse.json({ translation: globalCache.translation_ko });
  }

  const translation = await translateJapaneseLine(text);
  const nextCache = { ...cache, [cacheKey]: translation };
  await admin.from("documents").update({ body_line_translations: nextCache }).eq("id", id).eq("user_id", user.id);
  await admin.from("line_translation_cache").upsert({
    source_text: text,
    translation_ko: translation,
    updated_at: new Date().toISOString(),
  });

  return NextResponse.json({ translation });
}
