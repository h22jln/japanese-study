import OpenAI from "openai";

const PROMPT = `당신은 한국인 일본어 학습자를 위한 일본어 자료 요약 도우미입니다.
주어진 자료 내용을 한국어로 짧고 알기 쉽게 요약하세요.

- 핵심 주제와 학습 포인트를 포함
- 너무 길게 쓰지 말고 4~6개 bullet로 정리
- 일본어 문법/표현 자료라면 주요 문형과 뉘앙스를 중심으로 정리
- 프리토킹 자료라면 말하기 주제, 질문 방향, 쓸 만한 표현을 중심으로 정리
- 설명 없이 요약만 출력`;

export async function summarizeJapaneseDocument(lines: string[]) {
  if (!process.env.OPENAI_API_KEY) throw new Error("OpenAI API key is missing");

  const text = lines.map((line) => line.trim()).filter(Boolean).join("\n");
  if (!text) throw new Error("Document text is empty");

  const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
  const response = await openai.responses.create({
    model: process.env.OPENAI_MODEL ?? "gpt-5.6-luna",
    input: [{
      role: "user",
      content: [{ type: "input_text", text: `${PROMPT}\n\n자료 내용:\n${text}` }],
    }],
  });

  const output = response.output_text.trim();
  if (!output) throw new Error("Summary failed");
  return output;
}
