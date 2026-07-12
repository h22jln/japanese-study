import OpenAI from "openai";
import { z } from "zod";
import { zodTextFormat } from "openai/helpers/zod";

const translationSchema = z.object({
  glossesKo: z.array(z.string()),
});

const PROMPT = `당신은 일본어 학습용 사전 번역기입니다.
영어 사전 뜻 목록을 자연스러운 한국어 뜻 목록으로만 바꾸세요.

- 각 항목은 짧은 사전식 표현으로 번역
- 불필요한 설명 문장 금지
- 입력 순서를 유지
- 출력 개수는 입력 개수와 반드시 같아야 함`;

export async function translateGlossesToKorean(glosses: string[]) {
  if (!process.env.OPENAI_API_KEY) return glosses;

  const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
  const response = await openai.responses.parse({
    model: process.env.OPENAI_MODEL ?? "gpt-5.6-luna",
    input: [{
      role: "user",
      content: [
        {
          type: "input_text",
          text: `${PROMPT}\n\n영어 뜻 목록:\n${glosses.map((gloss, index) => `${index + 1}. ${gloss}`).join("\n")}`,
        },
      ],
    }],
    text: { format: zodTextFormat(translationSchema, "dictionary_gloss_translation") },
  });

  const parsed = response.output_parsed;
  if (!parsed || parsed.glossesKo.length !== glosses.length) return glosses;
  return parsed.glossesKo.map((item) => item.trim()).filter(Boolean).length === glosses.length ? parsed.glossesKo : glosses;
}
