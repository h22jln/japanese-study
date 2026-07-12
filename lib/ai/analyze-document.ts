import OpenAI from "openai";
import { zodTextFormat } from "openai/helpers/zod";
import { analysisSchema } from "@/lib/ai/analysis-schema";
import { createAdminSupabaseClient } from "@/lib/supabase/admin";

const ANALYSIS_PROMPT = `당신은 한국인 일본어 학습자를 위한 교재 분석가입니다.
첨부된 PDF 전체를 분석하세요.

- title: 자료를 대표하는 간결한 일본어 또는 한국어 제목
- bodyText: PDF의 일본어 본문을 처음부터 끝까지 원문 그대로 추출. 제목, 본문, 대화문은 유지하고 반복되는 머리말·꼬리말·페이지 번호는 제외. 문단 사이는 빈 줄 하나로 구분
- vocabulary: 학습 가치가 높은 일본어 단어를 중복 없이 추출
- surface에는 bodyText에 실제 등장하는 표기를 정확히 사용
- dictionaryForm에는 활용형이 아닌 사전형을 사용
- reading에는 히라가나 읽기를 사용
- JLPT 급수를 확신할 수 없으면 null
- sourcePage는 확인 가능한 경우에만 페이지 번호, 아니면 null
- grammarPoints: 자료에서 실제로 사용된 주요 문법을 추출
- 예문이 자료에 없으면 문맥에 맞는 짧은 예문을 만들고 한국어 번역 제공`;

export async function analyzeDocument(payload: { documentId: string; userId: string }) {
  if (!process.env.OPENAI_API_KEY) throw new Error("OpenAI API key is missing");

  const supabase = createAdminSupabaseClient();
  const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
  await supabase.from("documents").update({ status: "processing", error_message: null }).eq("id", payload.documentId).eq("user_id", payload.userId);

  try {
    const { data: document, error: documentError } = await supabase
      .from("documents")
      .select("id,file_path,title")
      .eq("id", payload.documentId)
      .eq("user_id", payload.userId)
      .single();
    if (documentError || !document) throw new Error("Document not found");

    const { data: pdf, error: downloadError } = await supabase.storage.from("documents").download(document.file_path);
    if (downloadError || !pdf) throw new Error(`PDF download failed: ${downloadError?.message ?? "unknown"}`);

    const pdfBase64 = Buffer.from(await pdf.arrayBuffer()).toString("base64");
    const response = await openai.responses.parse({
      model: process.env.OPENAI_MODEL ?? "gpt-5.6-luna",
      input: [{
        role: "user",
        content: [
          { type: "input_file", filename: `${document.title}.pdf`, file_data: `data:application/pdf;base64,${pdfBase64}`, detail: "low" },
          { type: "input_text", text: ANALYSIS_PROMPT },
        ],
      }],
      text: { format: zodTextFormat(analysisSchema, "japanese_study_analysis") },
    });

    const analysis = response.output_parsed;
    if (!analysis) throw new Error("The model returned no structured analysis");

    const { error: clearLinksError } = await supabase.from("document_vocabulary").delete().eq("document_id", payload.documentId);
    if (clearLinksError) throw clearLinksError;
    const { error: clearGrammarError } = await supabase.from("grammar_points").delete().eq("document_id", payload.documentId);
    if (clearGrammarError) throw clearGrammarError;

    for (const word of analysis.vocabulary) {
      const { data: vocabulary, error: vocabularyError } = await supabase
        .from("vocabulary")
        .upsert({
          user_id: payload.userId,
          dictionary_form: word.dictionaryForm,
          reading: word.reading,
          meaning_ko: word.meaningKo,
          part_of_speech: word.partOfSpeech,
          jlpt_level: word.jlptLevel,
        }, { onConflict: "user_id,dictionary_form,reading" })
        .select("id")
        .single();
      if (vocabularyError || !vocabulary) throw vocabularyError ?? new Error("Vocabulary save failed");

      const { error: linkError } = await supabase.from("document_vocabulary").insert({
        document_id: payload.documentId,
        vocabulary_id: vocabulary.id,
        surface_form: word.surface,
        example_ja: word.exampleJa,
        example_ko: word.exampleKo,
        source_page: word.sourcePage,
      });
      if (linkError) throw linkError;
    }

    if (analysis.grammarPoints.length > 0) {
      const { error: grammarError } = await supabase.from("grammar_points").insert(
        analysis.grammarPoints.map((grammar) => ({
          document_id: payload.documentId,
          pattern: grammar.pattern,
          meaning_ko: grammar.meaningKo,
          explanation_ko: grammar.explanationKo,
          example_ja: grammar.exampleJa,
          example_ko: grammar.exampleKo,
        })),
      );
      if (grammarError) throw grammarError;
    }

    const { error: completeError } = await supabase.from("documents").update({
      title: analysis.title,
      body_text: analysis.bodyText,
      status: "completed",
      error_message: null,
    }).eq("id", payload.documentId).eq("user_id", payload.userId);
    if (completeError) throw completeError;

    return { documentId: payload.documentId, status: "completed" as const, vocabularyCount: analysis.vocabulary.length };
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown analysis error";
    await supabase.from("documents").update({ status: "failed", error_message: message.slice(0, 500) }).eq("id", payload.documentId).eq("user_id", payload.userId);
    throw error;
  }
}
