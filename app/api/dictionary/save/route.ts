import { NextResponse } from "next/server";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { createAdminSupabaseClient } from "@/lib/supabase/admin";
import { formatPartOfSpeech } from "@/lib/dictionary/format-part-of-speech";

type SavePayload = {
  entryId?: string;
  vocabularyId?: string;
  documentId?: string;
  surfaceForm?: string;
  aiEntry?: {
    dictionaryForm: string;
    reading: string;
    meaningKo: string;
    partOfSpeech?: string | null;
  };
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

  if (!vocabularyId && payload?.aiEntry) {
    const dictionaryForm = payload.aiEntry.dictionaryForm?.trim();
    const reading = payload.aiEntry.reading?.trim();
    const meaningKo = payload.aiEntry.meaningKo?.trim();
    const partOfSpeech = payload.aiEntry.partOfSpeech?.trim() || null;

    if (!dictionaryForm || !reading || !meaningKo) {
      return NextResponse.json({ error: "AI 단어 정보가 올바르지 않습니다." }, { status: 400 });
    }

    const { data: vocabulary, error: vocabularyError } = await admin
      .from("vocabulary")
      .upsert({
        user_id: user.id,
        dictionary_form: dictionaryForm,
        reading,
        meaning_ko: meaningKo,
        part_of_speech: partOfSpeech,
      }, { onConflict: "user_id,dictionary_form,reading" })
      .select("id")
      .single();

    if (vocabularyError || !vocabulary) {
      return NextResponse.json({ error: "AI 단어 저장에 실패했습니다." }, { status: 500 });
    }

    vocabularyId = vocabulary.id;
  }

  if (!vocabularyId) return NextResponse.json({ error: "저장할 단어가 없습니다." }, { status: 400 });

  const { data: existingCard } = await admin
    .from("review_cards")
    .select("id,confusion_count")
    .eq("user_id", user.id)
    .eq("vocabulary_id", vocabularyId)
    .maybeSingle();

  const { error } = existingCard
    ? await admin
        .from("review_cards")
        .update({
          confusion_count: (existingCard.confusion_count ?? 0) + 1,
          last_confused_at: new Date().toISOString(),
        })
        .eq("id", existingCard.id)
        .eq("user_id", user.id)
    : await admin
        .from("review_cards")
        .insert({ user_id: user.id, vocabulary_id: vocabularyId });

  if (error) return NextResponse.json({ error: "단어장 저장에 실패했습니다." }, { status: 500 });

  const documentId = payload?.documentId?.trim();
  const surfaceForm = payload?.surfaceForm?.trim().slice(0, 200);
  if (documentId && surfaceForm) {
    const { data: document } = await admin
      .from("documents")
      .select("id")
      .eq("id", documentId)
      .eq("user_id", user.id)
      .single();

    if (document) {
      const linkPayload = {
        document_id: documentId,
        vocabulary_id: vocabularyId,
        surface_form: surfaceForm,
        example_ja: null,
        example_ko: null,
        source_page: null,
        source: "user_lookup",
      };
      const { error: linkError } = await admin
        .from("document_vocabulary")
        .upsert(linkPayload, { onConflict: "document_id,vocabulary_id", ignoreDuplicates: true });
      if (linkError) {
        await admin
          .from("document_vocabulary")
          .upsert({
            document_id: linkPayload.document_id,
            vocabulary_id: linkPayload.vocabulary_id,
            surface_form: linkPayload.surface_form,
            example_ja: linkPayload.example_ja,
            example_ko: linkPayload.example_ko,
            source_page: linkPayload.source_page,
          }, { onConflict: "document_id,vocabulary_id", ignoreDuplicates: true });
      }
    }
  }

  return NextResponse.json({ ok: true, vocabularyId });
}
