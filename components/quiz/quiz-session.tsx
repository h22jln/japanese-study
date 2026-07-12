"use client";

import { useMemo, useState } from "react";

type QuizWord = {
  id: string;
  dictionaryForm: string;
  reading: string;
  meaningKo: string;
  partOfSpeech: string | null;
  jlptLevel: string | null;
};

type QuizMode = "meaning-to-word" | "word-to-meaning" | "multiple-choice" | "ox";
type ChoiceItem = {
  id: string;
  label: string;
  sublabel?: string;
  correct: boolean;
};
type ChoiceQuestion = {
  answer: QuizWord;
  prompt: string;
  helper: string;
  choices: ChoiceItem[];
};
type OxQuestion = {
  answer: QuizWord;
  prompt: string;
  helper: string;
  oxMeaning: string;
  oxCorrect: boolean;
};

const MODE_LABELS: Record<QuizMode, string> = {
  "meaning-to-word": "뜻 → 단어",
  "word-to-meaning": "단어 → 뜻",
  "multiple-choice": "4지선다",
  ox: "OX 복습",
};

function seededValue(seed: number) {
  const value = Math.sin(seed * 999 + 17) * 10000;
  return value - Math.floor(value);
}

function seededShuffle<T>(items: T[], seed: number) {
  const next = [...items];
  for (let index = next.length - 1; index > 0; index -= 1) {
    const target = Math.floor(seededValue(seed + index) * (index + 1));
    [next[index], next[target]] = [next[target], next[index]];
  }
  return next;
}

function pickDistractors(words: QuizWord[], answer: QuizWord, count: number) {
  return words.filter((word) => word.id !== answer.id).slice(0, count);
}

export function QuizSession({ words }: { words: QuizWord[] }) {
  const [mode, setMode] = useState<QuizMode>("multiple-choice");
  const [seed, setSeed] = useState(0);
  const [score, setScore] = useState({ solved: 0, correct: 0 });
  const [selectedChoice, setSelectedChoice] = useState<string | null>(null);
  const [oxSelection, setOxSelection] = useState<boolean | null>(null);

  const question = useMemo<ChoiceQuestion | OxQuestion | null>(() => {
    const pool = seededShuffle(words, seed + mode.length);
    const answer = pool[0];
    if (!answer) return null;

    if (mode === "meaning-to-word") {
      const choices = seededShuffle([answer, ...pickDistractors(pool, answer, 3)], seed + 11);
      return {
        answer,
        prompt: answer.meaningKo,
        helper: "이 뜻에 맞는 단어를 골라보세요.",
        choices: choices.map((item) => ({
          id: item.id,
          label: item.dictionaryForm,
          sublabel: item.reading,
          correct: item.id === answer.id,
        })),
      };
    }

    if (mode === "word-to-meaning" || mode === "multiple-choice") {
      const choices = seededShuffle([answer, ...pickDistractors(pool, answer, 3)], seed + 23);
      return {
        answer,
        prompt: answer.dictionaryForm,
        helper: `${answer.reading} · 뜻을 골라보세요.`,
        choices: choices.map((item) => ({
          id: item.id,
          label: item.meaningKo,
          sublabel: item.partOfSpeech ?? undefined,
          correct: item.id === answer.id,
        })),
      };
    }

    const showTrue = seed % 2 === 0 || words.length < 2;
    const wrongWord = showTrue ? answer : pickDistractors(pool, answer, 1)[0] ?? answer;
    return {
      answer,
      prompt: answer.dictionaryForm,
      helper: `${answer.reading} · 아래 뜻이 맞으면 O, 아니면 X`,
      oxMeaning: showTrue ? answer.meaningKo : wrongWord.meaningKo,
      oxCorrect: showTrue,
    };
  }, [mode, seed, words]);

  if (!question) return null;

  const choiceQuestion: ChoiceQuestion | null = "choices" in question ? question : null;
  const oxQuestion: OxQuestion | null = "oxMeaning" in question ? question : null;

  const resolvedChoice = choiceQuestion && selectedChoice
    ? choiceQuestion.choices.find((choice) => choice.id === selectedChoice) ?? null
    : null;
  const isChoiceCorrect = resolvedChoice ? resolvedChoice.correct : null;
  const isOxCorrect = oxQuestion && oxSelection !== null ? oxSelection === oxQuestion.oxCorrect : null;
  const isAnswered = mode === "ox" ? oxSelection !== null : selectedChoice !== null;

  function moveNext(correct: boolean) {
    setScore((current) => ({
      solved: current.solved + 1,
      correct: current.correct + (correct ? 1 : 0),
    }));
    setSelectedChoice(null);
    setOxSelection(null);
    setSeed((value) => value + 1);
  }

  function changeMode(nextMode: QuizMode) {
    setMode(nextMode);
    setSelectedChoice(null);
    setOxSelection(null);
    setSeed((value) => value + 1);
  }

  return (
    <div className="space-y-3 sm:space-y-5">
      <section className="rounded-3xl border border-[var(--line)] bg-white p-3 sm:p-6">
        <div className="-mx-1 flex gap-2 overflow-x-auto px-1 pb-1 sm:mx-0 sm:flex-wrap sm:overflow-visible sm:px-0 sm:pb-0">
          {(Object.keys(MODE_LABELS) as QuizMode[]).map((item) => (
            <button
              key={item}
              type="button"
              onClick={() => changeMode(item)}
              className={`shrink-0 rounded-full px-3 py-2 text-xs font-semibold transition sm:px-4 sm:py-2 sm:text-sm ${
                mode === item
                  ? "bg-[var(--accent)] text-white"
                  : "bg-[#f3f1eb] text-[var(--muted)] hover:text-[var(--foreground)]"
              }`}
            >
              {MODE_LABELS[item]}
            </button>
          ))}
        </div>

        <div className="mt-3 flex items-center justify-between gap-3 rounded-2xl bg-[#f7f7f4] px-3 py-2 sm:mt-4 sm:bg-transparent sm:px-0 sm:py-0">
          <p className="text-xs font-semibold text-[var(--muted)] sm:text-sm">
            맞힌 수 {score.correct} / {score.solved}
          </p>
          <button
            type="button"
            onClick={() => {
              setScore({ solved: 0, correct: 0 });
              setSelectedChoice(null);
              setOxSelection(null);
              setSeed((value) => value + 1);
            }}
            className="rounded-full border border-[var(--line)] bg-white px-3 py-1.5 text-xs font-semibold text-[var(--muted)] transition hover:border-[var(--accent)] hover:text-[var(--accent)] sm:px-4 sm:py-2 sm:text-sm"
          >
            기록 초기화
          </button>
        </div>
      </section>

      <section className="rounded-3xl border border-[var(--line)] bg-white p-4 sm:p-8">
        <div className="xl:grid xl:grid-cols-[minmax(0,1.2fr)_320px] xl:gap-6">
          <div className="min-w-0">
            <div className="rounded-3xl bg-[#faf5f1] p-4 sm:bg-transparent sm:p-0">
              <p className="text-sm font-bold text-[var(--accent)]">{MODE_LABELS[mode]}</p>
              <h2 className="mt-3 break-words text-[2rem] font-bold leading-tight sm:mt-4 sm:text-4xl">{question.prompt}</h2>
              <p className="mt-2 text-sm text-[var(--muted)] sm:mt-3">{question.helper}</p>
            </div>

            {choiceQuestion ? (
              <div className="mt-5 grid gap-2 sm:mt-8 sm:grid-cols-2 sm:gap-3">
                {choiceQuestion.choices.map((choice, index) => {
                  const selected = selectedChoice === choice.id;
                  const revealCorrect = isAnswered && choice.correct;
                  const revealWrong = selected && isAnswered && !choice.correct;

                  return (
                    <button
                      key={choice.id}
                      type="button"
                      disabled={isAnswered}
                      onClick={() => setSelectedChoice(choice.id)}
                      className={`rounded-2xl border bg-white p-3 text-left shadow-sm transition sm:p-4 ${
                        revealCorrect
                          ? "border-[#7bbf8e] bg-[#eef8f0]"
                          : revealWrong
                            ? "border-[#e08b84] bg-[#fff2f1]"
                            : selected
                              ? "border-[var(--accent)] bg-[#fff4ef]"
                              : "border-[var(--line)] hover:border-[var(--accent)]"
                      }`}
                    >
                      <p className="text-[10px] font-bold text-[var(--muted)] sm:text-xs">선택지 {index + 1}</p>
                      <p className="mt-1 break-words text-lg font-bold leading-7 sm:mt-2">{choice.label}</p>
                      {choice.sublabel && <p className="mt-0.5 text-xs text-[var(--muted)] sm:mt-1 sm:text-sm">{choice.sublabel}</p>}
                    </button>
                  );
                })}
              </div>
            ) : (
              <div className="mt-5 sm:mt-8">
                <div className="rounded-2xl bg-[#f7f7f4] p-4 sm:p-5">
                  <p className="text-base font-semibold sm:text-lg">{oxQuestion?.oxMeaning}</p>
                </div>
                <div className="mt-3 grid grid-cols-2 gap-2 sm:mt-4 sm:gap-3">
                  <button
                    type="button"
                    disabled={isAnswered}
                    onClick={() => setOxSelection(true)}
                    className={`rounded-2xl border px-4 py-3 text-base font-bold transition sm:py-4 sm:text-lg ${
                      oxSelection === true ? "border-[var(--accent)] bg-[#fff4ef]" : "border-[var(--line)] bg-white hover:border-[var(--accent)]"
                    }`}
                  >
                    O
                  </button>
                  <button
                    type="button"
                    disabled={isAnswered}
                    onClick={() => setOxSelection(false)}
                    className={`rounded-2xl border px-4 py-3 text-base font-bold transition sm:py-4 sm:text-lg ${
                      oxSelection === false ? "border-[var(--accent)] bg-[#fff4ef]" : "border-[var(--line)] bg-white hover:border-[var(--accent)]"
                    }`}
                  >
                    X
                  </button>
                </div>
              </div>
            )}
          </div>

          <div className={`mt-4 xl:mt-0 ${isAnswered ? "block" : "hidden xl:block"}`}>
            <div className="rounded-2xl bg-[#f7f7f4] p-4 sm:p-5 xl:sticky xl:top-6">
              {isAnswered ? (
                <>
                  <p className={`text-sm font-bold ${(choiceQuestion ? isChoiceCorrect : isOxCorrect) ? "text-[#2f7a47]" : "text-[#c25950]"}`}>
                    {(choiceQuestion ? isChoiceCorrect : isOxCorrect) ? "정답!" : "아쉬워요"}
                  </p>
                  <p className="mt-2 text-base font-bold sm:text-lg">{question.answer.dictionaryForm}</p>
                  <p className="mt-1 text-xs text-[var(--muted)] sm:text-sm">{question.answer.reading}</p>
                  <p className="mt-2 text-sm font-semibold sm:mt-3">{question.answer.meaningKo}</p>
                  <button
                    type="button"
                    onClick={() => moveNext(Boolean(choiceQuestion ? isChoiceCorrect : isOxCorrect))}
                    className="mt-4 inline-flex h-10 items-center justify-center rounded-full bg-[var(--foreground)] px-4 text-sm font-semibold text-white sm:mt-5 sm:h-11 sm:px-5"
                  >
                    다음 문제
                  </button>
                </>
              ) : (
                <>
                  <p className="text-sm font-bold text-[var(--accent)]">준비됨</p>
                  <p className="mt-2 text-sm leading-6 text-[var(--muted)]">
                    답을 고르면 여기에서 바로 정답과 뜻을 확인할 수 있어요.
                  </p>
                  <div className="mt-4 rounded-2xl bg-white p-4">
                    <p className="text-base font-bold">{question.answer.dictionaryForm}</p>
                    <p className="mt-1 text-xs text-[var(--muted)]">{question.answer.reading}</p>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
