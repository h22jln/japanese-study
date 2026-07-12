const PART_OF_SPEECH_MAP: Array<[RegExp, string]> = [
  [/proper noun/i, "고유명사"],
  [/pronoun/i, "대명사"],
  [/noun/i, "명사"],
  [/suru verb|verb/i, "동사"],
  [/i-adjective|adjective/i, "형용사"],
  [/adverb/i, "부사"],
  [/particle/i, "조사"],
  [/conjunction/i, "접속사"],
  [/interjection/i, "감탄사"],
  [/auxiliary/i, "조동사"],
  [/prefix/i, "접두사"],
  [/suffix/i, "접미사"],
  [/expression/i, "표현"],
  [/numeric/i, "수사"],
];

function normalizePartOfSpeech(value: string) {
  return value.trim().replace(/\s+/g, " ");
}

export function formatPartOfSpeech(value: string | null | undefined) {
  if (!value) return null;

  const normalized = normalizePartOfSpeech(value);
  if (!normalized) return null;

  if (/[가-힣]/.test(normalized)) return normalized;

  for (const [pattern, label] of PART_OF_SPEECH_MAP) {
    if (pattern.test(normalized)) return label;
  }

  return null;
}

export function formatPartOfSpeechList(values: string[] | null | undefined) {
  if (!values || values.length === 0) return [];

  return [...new Set(values.map((value) => formatPartOfSpeech(value)).filter((value): value is string => Boolean(value)))];
}
