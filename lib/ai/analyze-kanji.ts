import OpenAI from "openai";
import { z } from "zod";
import { zodTextFormat } from "openai/helpers/zod";
import { createAdminSupabaseClient } from "@/lib/supabase/admin";

const kanjiStudySchema = z.object({
  items: z.array(z.object({
    kanji: z.string().min(1).max(2),
    readings: z.array(z.string()).min(1),
    meaningKo: z.string(),
    radical: z.string().nullable(),
    mnemonicKo: z.string(),
    exampleWords: z.array(z.object({
      word: z.string(),
      reading: z.string(),
      meaningKo: z.string(),
    })).max(5),
  })).max(40),
});

type KanjiStudyResult = z.infer<typeof kanjiStudySchema>;

const KANJI_PATTERN = /[\u3400-\u9fff]/g;

const KANJI_STUDY_PROMPT = `당신은 한국인 일본어 학습자를 위한 한자 학습 코치입니다.
아래 자료에서 나온 단어와 본문을 바탕으로, 이 자료를 읽는 데 도움이 되는 한자를 정리하세요.

원칙:
- 자료 단어/본문에 실제로 나온 한자를 우선
- 너무 쉬운 한자와 반복 빈도가 낮은 한자는 필요하면 제외
- 최대 40개
- kanji는 한 글자 한자만
- readings에는 이 자료 단어를 읽을 때 유용한 음독/훈독을 히라가나로 1~4개
- meaningKo는 한국어 핵심 뜻을 짧게
- radical은 한국어 부수 이름 또는 대표 부수 한자, 확실하지 않으면 null
- mnemonicKo는 억지 말장난보다 실제 형태/뜻/단어와 연결되는 쉬운 암기 힌트
- exampleWords에는 제공된 단어 중 해당 한자가 들어간 단어를 우선 사용
- 한국인 학습자가 바로 외울 수 있게 간결하게 작성`;

function extractKanjiCandidates(values: string[]) {
  return [...new Set(values.flatMap((value) => value.match(KANJI_PATTERN) ?? []))];
}

export async function analyzeDocumentKanji(payload: { documentId: string; userId: string }) {
  if (!process.env.OPENAI_API_KEY) throw new Error("OpenAI API key is missing");

  const supabase = createAdminSupabaseClient();
  const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

  const { data: document, error: documentError } = await supabase
    .from("documents")
    .select("id,title,body_lines")
    .eq("id", payload.documentId)
    .eq("user_id", payload.userId)
    .single();
  if (documentError || !document) throw new Error("Document not found");

  const { data: links } = await supabase
    .from("document_vocabulary")
    .select("vocabulary(dictionary_form,reading,meaning_ko)")
    .eq("document_id", payload.documentId);

  const vocabulary = (links ?? []).flatMap((item) => {
    const rawVocabulary = item.vocabulary;
    const vocabularyItem = Array.isArray(rawVocabulary) ? rawVocabulary[0] : rawVocabulary;
    if (!vocabularyItem) return [];
    return [{
      word: vocabularyItem.dictionary_form,
      reading: vocabularyItem.reading,
      meaningKo: vocabularyItem.meaning_ko,
    }];
  });
  const bodyLines = Array.isArray(document.body_lines)
    ? document.body_lines.map((line) => typeof line === "string" ? line : line?.japanese).filter(Boolean)
    : [];
  const kanjiCandidates = extractKanjiCandidates([
    ...vocabulary.map((item) => item.word),
    ...bodyLines,
  ]);

  if (kanjiCandidates.length === 0) {
    await supabase.from("document_kanji").delete().eq("document_id", payload.documentId);
    return { count: 0 };
  }

  const response = await openai.responses.parse({
    model: process.env.OPENAI_MODEL ?? "gpt-5.6-luna",
    input: [{
      role: "user",
      content: [{
        type: "input_text",
        text: `${KANJI_STUDY_PROMPT}

자료 제목: ${document.title}
후보 한자: ${kanjiCandidates.join(" ")}

[자료 단어]
${vocabulary.map((item) => `- ${item.word} (${item.reading}): ${item.meaningKo}`).join("\n")}

[본문 일부]
${bodyLines.slice(0, 80).join("\n")}`,
      }],
    }],
    text: { format: zodTextFormat(kanjiStudySchema, "document_kanji_study") },
  });

  const analysis = response.output_parsed as KanjiStudyResult | null;
  if (!analysis) throw new Error("The model returned no kanji study result");

  await supabase.from("document_kanji").delete().eq("document_id", payload.documentId);
  if (analysis.items.length === 0) return { count: 0 };

  const { error } = await supabase.from("document_kanji").insert(
    analysis.items.map((item) => ({
      document_id: payload.documentId,
      kanji: item.kanji,
      readings: item.readings,
      meaning_ko: item.meaningKo,
      radical: item.radical,
      mnemonic_ko: item.mnemonicKo,
      example_words: item.exampleWords,
    })),
  );
  if (error) throw error;

  return { count: analysis.items.length };
}
