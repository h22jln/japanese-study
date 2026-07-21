"use client";

import { Eye, EyeOff } from "lucide-react";
import { useMemo, useState } from "react";
import { SaveVocabularyButton } from "@/components/vocabulary/save-vocabulary-button";
import { formatPartOfSpeech } from "@/lib/dictionary/format-part-of-speech";

type SavedCard = {
  id: string;
  vocabulary_id: string;
  saved_at: string | null;
  confusion_count: number | null;
  last_confused_at: string | null;
  vocabulary: {
    id: string;
    dictionary_form: string;
    reading: string;
    meaning_ko: string;
    part_of_speech: string | null;
    jlpt_level: string | null;
  };
};

type VocabularyStudyListProps = {
  groupedCards: Array<[string, SavedCard[]]>;
  userId: string;
};

export function VocabularyStudyList({ groupedCards, userId }: VocabularyStudyListProps) {
  const [hideJapanese, setHideJapanese] = useState(false);
  const [hideMeaning, setHideMeaning] = useState(false);
  const [shownJapaneseIds, setShownJapaneseIds] = useState<string[]>([]);
  const [shownMeaningIds, setShownMeaningIds] = useState<string[]>([]);
  const allCards = useMemo(() => groupedCards.flatMap(([, cards]) => cards), [groupedCards]);

  function toggleJapanese(cardId: string) {
    if (!hideJapanese) return;
    setShownJapaneseIds((current) => current.includes(cardId) ? current.filter((id) => id !== cardId) : [...current, cardId]);
  }

  function toggleMeaning(cardId: string) {
    if (!hideMeaning) return;
    setShownMeaningIds((current) => current.includes(cardId) ? current.filter((id) => id !== cardId) : [...current, cardId]);
  }

  function toggleAllJapanese() {
    setHideJapanese((current) => !current);
    setShownJapaneseIds([]);
  }

  function toggleAllMeaning() {
    setHideMeaning((current) => !current);
    setShownMeaningIds([]);
  }

  return (
    <section className="mt-8 space-y-6 sm:mt-10">
      <div className="sticky top-0 z-20 -mx-4 border-y border-[var(--line)] bg-[var(--background)]/95 px-4 py-3 backdrop-blur sm:top-0 sm:mx-0 sm:rounded-2xl sm:border sm:bg-white/90">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-sm font-semibold text-[var(--muted)]">{allCards.length}개 단어 암기</p>
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={toggleAllJapanese}
              className="inline-flex min-h-9 items-center gap-1.5 rounded-full border border-[var(--line)] bg-white px-3 text-xs font-bold transition hover:border-[var(--accent)] hover:text-[var(--accent)]"
            >
              {hideJapanese ? <Eye size={14} /> : <EyeOff size={14} />} 일본어 모두 {hideJapanese ? "보이기" : "가리기"}
            </button>
            <button
              type="button"
              onClick={toggleAllMeaning}
              className="inline-flex min-h-9 items-center gap-1.5 rounded-full border border-[var(--line)] bg-white px-3 text-xs font-bold transition hover:border-[var(--accent)] hover:text-[var(--accent)]"
            >
              {hideMeaning ? <Eye size={14} /> : <EyeOff size={14} />} 뜻 모두 {hideMeaning ? "보이기" : "가리기"}
            </button>
          </div>
        </div>
      </div>

      {groupedCards.map(([savedDate, cards]) => (
        <section key={savedDate}>
          <div className="flex items-center justify-between gap-3">
            <h2 className="text-lg font-bold">{savedDate}</h2>
            <span className="text-xs text-[var(--muted)]">{cards.length}개</span>
          </div>

          <div className="mt-3 overflow-hidden rounded-2xl border border-[var(--line)] bg-white">
            {cards.map((card) => {
              const partOfSpeech = formatPartOfSpeech(card.vocabulary.part_of_speech);
              const japaneseVisible = !hideJapanese || shownJapaneseIds.includes(card.id);
              const meaningVisible = !hideMeaning || shownMeaningIds.includes(card.id);

              return (
                <article key={card.id} className="grid gap-3 border-b border-[var(--line)] p-4 last:border-b-0 sm:grid-cols-[minmax(0,1fr)_minmax(0,1fr)_auto] sm:items-center">
                  <button
                    type="button"
                    onClick={() => toggleJapanese(card.id)}
                    className={`min-w-0 rounded-xl p-3 text-left transition ${hideJapanese ? "cursor-pointer bg-[#f7f7f4] hover:bg-[#f1eee7]" : "cursor-default"}`}
                  >
                    {japaneseVisible ? (
                      <>
                        <div className="flex flex-wrap items-center gap-2">
                          <h3 className="break-words font-['Noto_Sans_JP','Noto_Sans_KR',Arial,sans-serif] text-xl font-bold leading-snug">{card.vocabulary.dictionary_form}</h3>
                          {card.vocabulary.jlpt_level && <span className="rounded-full bg-[#f1eee7] px-2 py-0.5 text-[10px] font-bold">{card.vocabulary.jlpt_level}</span>}
                          {(card.confusion_count ?? 0) > 0 && <span className="rounded-full bg-[#fff0cc] px-2 py-0.5 text-[10px] font-bold text-[#9a5b00]">재확인 {card.confusion_count}</span>}
                        </div>
                        <p className="mt-1 break-words text-sm text-[var(--muted)]">{card.vocabulary.reading}{partOfSpeech ? ` · ${partOfSpeech}` : ""}</p>
                      </>
                    ) : (
                      <div className="grid min-h-14 place-items-center rounded-lg border border-dashed border-[#d8d8d0] text-sm font-bold text-[var(--muted)]">일본어 보기</div>
                    )}
                  </button>

                  <button
                    type="button"
                    onClick={() => toggleMeaning(card.id)}
                    className={`min-w-0 rounded-xl p-3 text-left transition ${hideMeaning ? "cursor-pointer bg-[#f7f7f4] hover:bg-[#f1eee7]" : "cursor-default"}`}
                  >
                    {meaningVisible ? (
                      <>
                        <p className="break-words text-base font-bold leading-7">{card.vocabulary.meaning_ko}</p>
                        {card.last_confused_at && <p className="mt-1 text-xs text-[var(--muted)]">최근 재확인 {new Intl.DateTimeFormat("ko-KR", { dateStyle: "medium" }).format(new Date(card.last_confused_at))}</p>}
                      </>
                    ) : (
                      <div className="grid min-h-14 place-items-center rounded-lg border border-dashed border-[#d8d8d0] text-sm font-bold text-[var(--muted)]">뜻 보기</div>
                    )}
                  </button>

                  <div className="justify-self-end">
                    <SaveVocabularyButton vocabularyId={card.vocabulary.id} userId={userId} initialSaved compact />
                  </div>
                </article>
              );
            })}
          </div>
        </section>
      ))}
    </section>
  );
}
