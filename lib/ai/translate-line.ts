import OpenAI from "openai";

const PROMPT = `당신은 일본어 학습용 번역 도우미입니다.
주어진 일본어 한 줄만 자연스럽고 간결한 한국어로 번역하세요.

- 설명 없이 번역 결과만 출력
- 지나치게 의역하지 말 것
- 학습자가 보기 쉬운 문장으로 만들 것`;

export async function translateJapaneseLine(text: string) {
  if (!process.env.OPENAI_API_KEY) throw new Error("OpenAI API key is missing");

  const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
  const response = await openai.responses.create({
    model: process.env.OPENAI_MODEL ?? "gpt-5.6-luna",
    input: [{
      role: "user",
      content: [{ type: "input_text", text: `${PROMPT}\n\n일본어:\n${text}` }],
    }],
  });

  const output = response.output_text.trim();
  if (!output) throw new Error("Translation failed");
  return output;
}
