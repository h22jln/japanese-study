import OpenAI from "openai";
import { z } from "zod";
import { zodTextFormat } from "openai/helpers/zod";

const dictionaryLookupSchema = z.object({
  dictionaryForm: z.string().trim().min(1),
  reading: z.string().trim().min(1),
  meaningKo: z.array(z.string().trim().min(1)).min(1).max(4),
  partOfSpeech: z.array(z.string().trim().min(1)).min(1).max(3),
});

const PROMPT = `당신은 일본어 학습용 초간단 사전입니다.
주어진 일본어 단어/표현에 대해 학습자가 바로 이해할 수 있는 핵심 정보만 한국어로 정리하세요.

- dictionaryForm: 반드시 사전 표제형. 동사는 사전형(辞書形), 형용사는 기본형, 명사는 표제형
- reading: 히라가나 읽기
- meaningKo: 표제형의 기본 한국어 뜻 목록
- partOfSpeech: 품사 목록 (예: 명사, 동사, 형용사, 부사, 조사)
- 검색어가 활용형, 과거형, 부정형, 가능형, 수동형, 사역형이어도 dictionaryForm과 meaningKo는 원래 표제어 기준으로 반환
- 예: "振らない"는 dictionaryForm "振る", meaningKo는 "흔들다", "뿌리치다"처럼 쓰고 "흔들지 않다"로 쓰지 말 것
- 예: "行かなかった"는 dictionaryForm "行く", meaningKo는 "가다"처럼 쓰고 "가지 않았다"로 쓰지 말 것
- 확신이 낮아도 가장 가능성 높은 1개 항목만 반환
- 군더더기 설명 금지
- JSON 스키마에 맞춰서만 반환`;

export async function searchJapaneseTermWithAI(term: string) {
  if (!process.env.OPENAI_API_KEY) return null;

  const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
  const response = await openai.responses.parse({
    model: process.env.OPENAI_MODEL ?? "gpt-5.6-luna",
    input: [{
      role: "user",
      content: [
        {
          type: "input_text",
          text: `${PROMPT}\n\n검색어:\n${term}`,
        },
      ],
    }],
    text: { format: zodTextFormat(dictionaryLookupSchema, "dictionary_lookup") },
  });

  const parsed = response.output_parsed;
  if (!parsed) return null;

  return {
    dictionaryForm: parsed.dictionaryForm.trim(),
    reading: parsed.reading.trim(),
    meaningKo: parsed.meaningKo.map((item) => item.trim()).filter(Boolean),
    partOfSpeech: parsed.partOfSpeech.map((item) => item.trim()).filter(Boolean),
  };
}
