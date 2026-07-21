import { NextResponse } from "next/server";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { createAdminSupabaseClient } from "@/lib/supabase/admin";
import type { DictionaryEntry } from "@/lib/dictionary/types";
import { translateGlossesToKorean } from "@/lib/dictionary/translate-glosses";
import { searchJapaneseTermWithAI } from "@/lib/ai/search-japanese-term";

function uniqueStrings(values: string[]) {
  return [...new Set(values.filter(Boolean))];
}

function isSingleKanji(term: string) {
  return /^[\p{Script=Han}]$/u.test(term);
}

function canUseAiFallback(term: string) {
  const normalized = term.trim();
  if (normalized.length < 2) return false;
  if (isSingleKanji(normalized)) return false;
  return true;
}

function looksInflected(term: string) {
  return /(ない|なかった|ません|ませんでした|た|て|れる|られる|せる|させる|たい|そう|れば|えば|いた|いだ|した|った|んだ)$/.test(term);
}

export async function GET(request: Request) {
  const supabase = await createServerSupabaseClient();
  if (!supabase) return NextResponse.json({ error: "Supabase is not configured" }, { status: 503 });

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(request.url);
  const term = searchParams.get("term")?.trim().slice(0, 50);
  if (!term) return NextResponse.json({ error: "검색어를 입력해주세요." }, { status: 400 });

  const admin = createAdminSupabaseClient();

  const [{ data: localVocabularyByForm }, { data: localVocabularyByReading }, { data: matchedTerms }] = await Promise.all([
    admin
      .from("vocabulary")
      .select("id,dictionary_form,reading,meaning_ko,part_of_speech")
      .eq("user_id", user.id)
      .eq("dictionary_form", term)
      .limit(5),
    admin
      .from("vocabulary")
      .select("id,dictionary_form,reading,meaning_ko,part_of_speech")
      .eq("user_id", user.id)
      .eq("reading", term)
      .limit(5),
    admin
      .from("dictionary_terms")
      .select("entry_id,term,term_type")
      .eq("term", term)
      .limit(20),
  ]);

  let entryIds = uniqueStrings((matchedTerms ?? []).map((item) => item.entry_id));

  if (entryIds.length === 0) {
    const { data: fallbackTerms } = await admin
      .from("dictionary_terms")
      .select("entry_id,term,term_type")
      .ilike("term", `${term}%`)
      .limit(20);
    entryIds = uniqueStrings((fallbackTerms ?? []).map((item) => item.entry_id));
  }

  let entries: DictionaryEntry[] = [];
  if (entryIds.length > 0) {
    const { data } = await admin
      .from("dictionary_entries")
      .select("id,primary_spelling,primary_reading,spellings,readings,glosses,glosses_ko,parts_of_speech,is_common")
      .in("id", entryIds)
      .order("is_common", { ascending: false })
      .limit(8);
    entries = (data ?? []) as DictionaryEntry[];
  }

  const entriesWithKorean = await Promise.all(entries.map(async (entry) => {
    if (entry.glosses_ko.length > 0) return entry;
    const glossesKo = await translateGlossesToKorean(entry.glosses.slice(0, 6));
    await admin.from("dictionary_entries").update({ glosses_ko: glossesKo }).eq("id", entry.id);
    return { ...entry, glosses_ko: glossesKo };
  }));

  const localVocabulary = [
    ...((localVocabularyByForm ?? []).map((item) => JSON.stringify(item))),
    ...((localVocabularyByReading ?? []).map((item) => JSON.stringify(item))),
  ].filter((value, index, values) => values.indexOf(value) === index).map((value) => JSON.parse(value) as {
    id: string;
    dictionary_form: string;
    reading: string;
    meaning_ko: string;
    part_of_speech: string | null;
  });

  const localVocabularyIds = localVocabulary.map((item) => item.id);
  const { data: savedCards } = localVocabularyIds.length > 0
    ? await admin.from("review_cards").select("vocabulary_id").eq("user_id", user.id).in("vocabulary_id", localVocabularyIds)
    : { data: [] };
  const savedVocabularyIds = new Set((savedCards ?? []).map((item) => item.vocabulary_id));

  let fallbackAiEntry: {
    id: string;
    primarySpelling: string | null;
    primaryReading: string;
    spellings: string[];
    readings: string[];
    glosses: string[];
    partsOfSpeech: string[];
    isCommon: boolean;
    isSaved?: boolean;
    source: "ai";
  } | null = null;

  if (localVocabulary.length === 0 && entriesWithKorean.length === 0 && canUseAiFallback(term)) {
    const { data: cachedAiEntry } = looksInflected(term)
      ? { data: null }
      : await admin
          .from("dictionary_ai_cache")
          .select("term,dictionary_form,reading,meanings_ko,parts_of_speech")
          .eq("term", term)
          .maybeSingle();

    if (cachedAiEntry) {
      fallbackAiEntry = {
        id: `ai:${cachedAiEntry.term}`,
        primarySpelling: cachedAiEntry.dictionary_form,
        primaryReading: cachedAiEntry.reading,
        spellings: [cachedAiEntry.dictionary_form],
        readings: [cachedAiEntry.reading],
        glosses: cachedAiEntry.meanings_ko.slice(0, 4),
        partsOfSpeech: cachedAiEntry.parts_of_speech.slice(0, 3),
        isCommon: false,
        source: "ai",
      };
    } else {
      const aiResult = await searchJapaneseTermWithAI(term);
      if (aiResult) {
        await admin.from("dictionary_ai_cache").upsert({
          term,
          dictionary_form: aiResult.dictionaryForm,
          reading: aiResult.reading,
          meanings_ko: aiResult.meaningKo.slice(0, 4),
          parts_of_speech: aiResult.partOfSpeech.slice(0, 3),
          updated_at: new Date().toISOString(),
        });

        fallbackAiEntry = {
          id: `ai:${term}`,
          primarySpelling: aiResult.dictionaryForm,
          primaryReading: aiResult.reading,
          spellings: [aiResult.dictionaryForm],
          readings: [aiResult.reading],
          glosses: aiResult.meaningKo.slice(0, 4),
          partsOfSpeech: aiResult.partOfSpeech.slice(0, 3),
          isCommon: false,
          source: "ai",
        };
      }
    }
  }

  return NextResponse.json({
    term,
    localVocabulary: (localVocabulary ?? []).map((item) => ({
      id: item.id,
      dictionaryForm: item.dictionary_form,
      reading: item.reading,
      meaningKo: item.meaning_ko,
      partOfSpeech: item.part_of_speech,
      isSaved: savedVocabularyIds.has(item.id),
    })),
    entries: [
      ...entriesWithKorean.map((entry) => ({
        id: entry.id,
        primarySpelling: entry.primary_spelling,
        primaryReading: entry.primary_reading,
        spellings: entry.spellings,
        readings: entry.readings,
        glosses: (entry.glosses_ko.length > 0 ? entry.glosses_ko : entry.glosses).slice(0, 6),
        partsOfSpeech: entry.parts_of_speech.slice(0, 4),
        isCommon: entry.is_common,
        source: "db" as const,
      })),
      ...(fallbackAiEntry ? [fallbackAiEntry] : []),
    ],
  });
}
