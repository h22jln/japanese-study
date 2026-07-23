import OpenAI from "openai";
import { zodTextFormat } from "openai/helpers/zod";
import { analysisSchema } from "@/lib/ai/analysis-schema";
import { extractPdfText } from "@/lib/pdf/extract-text";
import { createAdminSupabaseClient } from "@/lib/supabase/admin";

const ANALYSIS_PROMPT = `당신은 한국인 일본어 학습자를 위한 교재 분석가입니다.
아래에 제공된 PDF 추출 텍스트 전체를 분석하세요. 먼저 자료 유형을 판단한 뒤, 유형에 맞게 학습자가 복습하기 좋은 형태로 정리하세요.

자료 유형별 처리 기준:
- 본문/대화형 자료: 일본어 본문 흐름을 살리고, 본문에서 학습 가치가 높은 단어와 실제 사용된 문법을 추출
- 문법 핸드아웃형 자료: 문법 패턴, 뜻, 설명, 예문, 한국어 번역이 반복되는 자료로 보고 grammarPoints를 우선적으로 풍부하게 추출
- 프리토킹/질문형 자료: 주제 질문, 답변에 쓰면 좋은 표현, 관련 어휘가 모인 자료로 보고 말하기 복습에 유용하게 정리
- 문법 핸드아웃형에서는 같은 문법이 여러 번 반복되면 하나의 grammarPoint로 합치되, 예문은 자료 안의 대표 예문을 우선 사용
- 문법 핸드아웃형에서는 vocabulary를 억지로 많이 뽑지 말고, 예문 이해에 꼭 필요한 핵심 단어만 소량 추출
- 프리토킹/질문형에서는 bodyLines에 주요 질문과 답변용 일본어 표현을 담고, vocabulary에는 주제 핵심어와 말하기 표현을 우선 추출
- 프리토킹/질문형에서는 grammarPoints를 억지로 만들지 말고, "~ことで", "~にとどまらず", "~てほしい"처럼 답변 확장에 유용한 표현 문형이 보일 때만 추출
- 자료 안에 이미 한국어 뜻/설명/번역이 있으면 그 내용을 우선 반영하고, 어색한 부분만 자연스럽게 다듬기

- title: 자료를 대표하는 간결한 일본어 또는 한국어 제목
- bodyLines: 화면에 보여줄 일본어 본문 또는 문법 예문을 한 줄씩 담은 배열
- 본문/대화형 자료에서는 일본어 본문 흐름을 자연스럽게 나누기
- 문법 핸드아웃형 자료에서는 문법 패턴 제목과 일본어 예문을 중심으로 담고, 중복 슬라이드/반복 제목은 줄이기
- 프리토킹/질문형 자료에서는 질문과 답변에 바로 쓸 수 있는 표현을 중심으로 담고, 한국어 번역만 있는 줄은 제외
- 머리말·꼬리말·페이지 번호는 제외
- vocabulary: 학습 가치가 높은 일본어 단어를 중복 없이 추출
- surface에는 bodyLines에 실제 등장하는 표기를 정확히 사용
- dictionaryForm에는 활용형이 아닌 사전형을 사용
- reading에는 히라가나 읽기를 사용
- 단어 항목에는 예문을 만들지 말 것
- JLPT 급수를 확신할 수 없으면 null
- sourcePage는 확인 가능한 경우에만 페이지 번호, 아니면 null
- grammarPoints: 자료에서 실제로 사용된 주요 문법을 추출
- pattern에는 예: "て損した", "こそ", "からこそ"처럼 학습자가 외울 문법 형태를 간결하게 쓰기
- meaningKo에는 자료의 한국어 뜻을 짧게 쓰기
- explanationKo에는 반드시 줄을 나누어 "접속: ...", "뉘앙스: ...", "사용 상황: ..." 형식으로 쓰기
- 필요한 경우 "주의: ..."를 추가하되, 각 항목은 한두 문장 안에서 학습자가 바로 이해할 수 있게 쓰기
- 예문이 자료에 없으면 문맥에 맞는 짧은 예문을 만들고 한국어 번역 제공
- PDF 추출 결과에는 줄바꿈 노이즈가 있을 수 있으니, 의미가 자연스럽게 이어지도록 판단해서 정리`;

const IMAGE_ANALYSIS_PROMPT = `당신은 한국인 일본어 학습자를 위한 JLPT 독해 자료 분석가입니다.
업로드된 사진/스캔에서 일본어 독해 본문을 우선 읽고, 학습자가 복습하기 좋은 형태로 정리하세요.

중요 원칙:
- 본문 분석 + 문법 정리 + 단어 정리 위주로만 작업
- 문제 번호, 선택지, 정답 표시, 페이지 번호, 손글씨 메모는 가능하면 제외
- 사진에 본문과 문제 영역이 같이 있으면 본문 영역을 우선
- 필기나 형광펜이 있어도 원문 본문을 최대한 복원
- title: 자료를 대표하는 간결한 제목
- bodyLines: 본문 흐름이 자연스럽게 이어지도록 일본어 줄을 정리
- vocabulary: 본문 이해에 핵심인 단어만 중복 없이 추출
- grammarPoints: 본문에서 실제 학습 가치가 높은 문법만 추출
- sourcePage는 알 수 없으면 null
- 예문은 본문에 있는 문장을 우선 사용하고, 없으면 null 허용`;

function isImagePath(filePath: string) {
  return /\.(jpg|jpeg|png|webp|heic|heif)$/i.test(filePath);
}

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

    const { data: asset, error: downloadError } = await supabase.storage.from("documents").download(document.file_path);
    if (downloadError || !asset) throw new Error(`Document download failed: ${downloadError?.message ?? "unknown"}`);

    let response;
    if (isImagePath(document.file_path)) {
      const imageBuffer = Buffer.from(await asset.arrayBuffer());
      const mimeType = asset.type || "image/jpeg";
      const imageDataUrl = `data:${mimeType};base64,${imageBuffer.toString("base64")}`;
      response = await openai.responses.parse({
        model: process.env.OPENAI_MODEL ?? "gpt-5.6-luna",
        input: [{
          role: "user",
          content: [
            { type: "input_text", text: `${IMAGE_ANALYSIS_PROMPT}\n\n자료 제목: ${document.title}` },
            { type: "input_image", image_url: imageDataUrl, detail: "auto" },
          ],
        }],
        text: { format: zodTextFormat(analysisSchema, "jlpt_scan_analysis") },
      });
    } else {
      const pdfBuffer = Buffer.from(await asset.arrayBuffer());
      const extracted = await extractPdfText(pdfBuffer);
      response = await openai.responses.parse({
        model: process.env.OPENAI_MODEL ?? "gpt-5.6-luna",
        input: [{
          role: "user",
          content: [
            { type: "input_text", text: `${ANALYSIS_PROMPT}\n\n자료 제목: ${document.title}\n\n추출 방식: ${extracted.method}\n\n[PDF 추출 텍스트 시작]\n${extracted.text}\n[PDF 추출 텍스트 끝]` },
          ],
        }],
        text: { format: zodTextFormat(analysisSchema, "japanese_study_analysis") },
      });
    }

    const analysis = response.output_parsed;
    if (!analysis) throw new Error("The model returned no structured analysis");

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

      const linkPayload = {
        document_id: payload.documentId,
        vocabulary_id: vocabulary.id,
        surface_form: word.surface,
        example_ja: null,
        example_ko: null,
        source_page: word.sourcePage,
        source: "analysis",
      };
      const { error: linkError } = await supabase
        .from("document_vocabulary")
        .upsert(linkPayload, { onConflict: "document_id,vocabulary_id" });
      if (linkError) {
        const { error: legacyLinkError } = await supabase
          .from("document_vocabulary")
          .upsert({
            document_id: linkPayload.document_id,
            vocabulary_id: linkPayload.vocabulary_id,
            surface_form: linkPayload.surface_form,
            example_ja: linkPayload.example_ja,
            example_ko: linkPayload.example_ko,
            source_page: linkPayload.source_page,
          }, { onConflict: "document_id,vocabulary_id" });
        if (legacyLinkError) throw legacyLinkError;
      }
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
      body_lines: analysis.bodyLines,
      body_line_translations: {},
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
