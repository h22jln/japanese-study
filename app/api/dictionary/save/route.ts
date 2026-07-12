import { NextResponse } from "next/server";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { createAdminSupabaseClient } from "@/lib/supabase/admin";
import { formatPartOfSpeech } from "@/lib/dictionary/format-part-of-speech";

type SavePayload = {
  entryId?: string;
  vocabularyId?: string;
};

export async function POST(request: Request) {
  const supabase = await createServerSupabaseClient();
  if (!supabase) return NextResponse.json({ error: "Supabase is not configured" }, { status: 503 });

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const payload = await request.json().catch(() => null) as SavePayload | null;
  const admin = createAdminSupabaseClient();

  let vocabularyId = payload?.vocabularyId?.trim();

  if (!vocabularyId && payload?.entryId?.trim()) {
    const { data: entry } = await admin
      .from("dictionary_entries")
      .select("id,primary_spelling,primary_reading,glosses_ko,glosses,parts_of_speech")
      .eq("id", payload.entryId)
      .single();

    if (!entry) return NextResponse.json({ error: "사전 항목을 찾을 수 없습니다." }, { status: 404 });

    const meaning = entry.glosses_ko?.[0] ?? entry.glosses?.[0];
    if (!meaning) return NextResponse.json({ error: "저장할 뜻이 없습니다." }, { status: 400 });

    const { data: vocabulary, error: vocabularyError } = await admin
      .from("vocabulary")
      .upsert({
        user_id: user.id,
        dictionary_form: entry.primary_spelling ?? entry.primary_reading,
        reading: entry.primary_reading,
        meaning_ko: meaning,
        part_of_speech: formatPartOfSpeech(entry.parts_of_speech?.[0] ?? null),
      }, { onConflict: "user_id,dictionary_form,reading" })
      .select("id")
      .single();

    if (vocabularyError || !vocabulary) {
      return NextResponse.json({ error: "단어 저장에 실패했습니다." }, { status: 500 });
    }

    vocabularyId = vocabulary.id;
  }

  if (!vocabularyId) return NextResponse.json({ error: "저장할 단어가 없습니다." }, { status: 400 });

  const { error } = await admin
    .from("review_cards")
    .upsert({ user_id: user.id, vocabulary_id: vocabularyId }, { onConflict: "user_id,vocabulary_id" });

  if (error) return NextResponse.json({ error: "단어장 저장에 실패했습니다." }, { status: 500 });
  return NextResponse.json({ ok: true, vocabularyId });
}
