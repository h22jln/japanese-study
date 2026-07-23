import Link from "next/link";
import { ArrowLeft, BookOpen, Languages } from "lucide-react";
import { notFound, redirect } from "next/navigation";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { getKoreanHanjaReading } from "@/lib/kanji-korean-readings";

type DocumentVocabulary = {
  vocabulary: {
    id: string;
    dictionary_form: string;
    reading: string;
    meaning_ko: string;
  };
};

type SavedCard = {
  vocabulary_id: string;
};

type KanjiStudyCard = {
  kanji: string;
  words: Array<{
    id: string;
    word: string;
    reading: string;
    meaningKo: string;
  }>;
};

const kanjiPattern = /[\u3400-\u9fff]/;

function extractKanji(value: string) {
  return [...new Set([...value].filter((char) => kanjiPattern.test(char)))];
}

function buildKanjiCards(vocabularyItems: DocumentVocabulary[], savedVocabularyIds: Set<string>) {
  const cards = new Map<string, KanjiStudyCard>();

  for (const item of vocabularyItems) {
    const vocabulary = Array.isArray(item.vocabulary) ? item.vocabulary[0] : item.vocabulary;
    if (!vocabulary || !savedVocabularyIds.has(vocabulary.id)) continue;

    for (const kanji of extractKanji(vocabulary.dictionary_form)) {
      const current = cards.get(kanji) ?? { kanji, words: [] };
      if (!current.words.some((word) => word.id === vocabulary.id)) {
        current.words.push({
          id: vocabulary.id,
          word: vocabulary.dictionary_form,
          reading: vocabulary.reading,
          meaningKo: vocabulary.meaning_ko,
        });
      }
      cards.set(kanji, current);
    }
  }

  return [...cards.values()].sort((a, b) => b.words.length - a.words.length || a.kanji.localeCompare(b.kanji, "ja"));
}

export default async function DocumentKanjiPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createServerSupabaseClient();
  if (!supabase) redirect("/login");

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: document } = await supabase
    .from("documents")
    .select("id,title")
    .eq("id", id)
    .eq("user_id", user.id)
    .single();
  if (!document) notFound();

  const [{ data: documentVocabulary }, { data: savedCards }] = await Promise.all([
    supabase
      .from("document_vocabulary")
      .select("vocabulary(id,dictionary_form,reading,meaning_ko)")
      .eq("document_id", id),
    supabase
      .from("review_cards")
      .select("vocabulary_id")
      .eq("user_id", user.id),
  ]);

  const savedVocabularyIds = new Set(((savedCards ?? []) as SavedCard[]).map((card) => card.vocabulary_id));
  const cards = buildKanjiCards((documentVocabulary ?? []) as unknown as DocumentVocabulary[], savedVocabularyIds);
  const savedWordCount = new Set(cards.flatMap((card) => card.words.map((word) => word.id))).size;

  return (
    <main className="min-h-screen px-4 py-6 sm:px-6 sm:py-8 md:px-10">
      <div className="mx-auto max-w-6xl">
        <Link href={`/documents/${document.id}`} className="inline-flex items-center gap-2 text-sm font-semibold text-[var(--muted)] hover:text-[var(--foreground)]">
          <ArrowLeft size={16} /> 자료로 돌아가기
        </Link>

        <header className="mt-7 flex flex-col gap-4 sm:mt-8 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="text-sm font-bold text-[var(--accent)]">저장 단어 기반 한자 학습</p>
            <h1 className="mt-2 break-words text-2xl font-bold tracking-tight sm:text-3xl md:text-4xl">{document.title}</h1>
            <p className="mt-2 text-sm leading-6 text-[var(--muted)]">이 자료에서 내가 저장한 단어에 들어간 한자만 모았습니다.</p>
          </div>
          <p className="rounded-full bg-white px-4 py-2 text-sm font-bold text-[var(--muted)]">{cards.length}자 · 저장 단어 {savedWordCount}개</p>
        </header>

        {cards.length === 0 ? (
          <section className="mt-8 grid min-h-72 place-items-center rounded-3xl border border-dashed border-[#c9c9c1] bg-white/60 p-6 text-center">
            <div>
              <span className="mx-auto grid h-14 w-14 place-items-center rounded-2xl bg-[#f1eee7]"><BookOpen size={22} /></span>
              <h2 className="mt-5 text-xl font-bold">저장한 한자 단어가 없어요</h2>
              <p className="mt-2 text-sm leading-6 text-[var(--muted)]">자료 본문에서 단어를 저장하면, 그 단어에 들어간 한자가 여기 자동으로 모입니다.</p>
            </div>
          </section>
        ) : (
          <section className="mt-8 grid gap-3 sm:mt-10 sm:grid-cols-2 xl:grid-cols-3">
            {cards.map((card) => {
              const meanings = [...new Set(card.words.flatMap((word) => word.meaningKo.split(/[;,，、]/).map((value) => value.trim()).filter(Boolean)))].slice(0, 3);
              const readings = [...new Set(card.words.map((word) => word.reading))].slice(0, 4);
              const koreanReading = getKoreanHanjaReading(card.kanji);

              return (
                <article key={card.kanji} className="rounded-3xl border border-[var(--line)] bg-white p-5">
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <p className="font-['Noto_Sans_JP','Noto_Sans_KR',Arial,sans-serif] text-5xl font-black leading-none">{card.kanji}</p>
                      <p className="mt-3 text-sm font-bold text-[var(--accent)]">{meanings.join(" / ") || "저장 단어로 복습"}</p>
                    </div>
                    <span className="shrink-0 rounded-full bg-[#f1eee7] px-3 py-1 text-xs font-bold text-[var(--muted)]">{card.words.length}단어</span>
                  </div>

                  <dl className="mt-5 space-y-4">
                    <div>
                      <dt className="text-[11px] font-extrabold text-[var(--muted)]">한국식 한자 읽기</dt>
                      <dd className="mt-1 text-lg font-extrabold">{koreanReading ?? "저장 단어로 확인"}</dd>
                    </div>

                    <div>
                      <dt className="flex items-center gap-1.5 text-[11px] font-extrabold text-[var(--muted)]"><Languages size={13} /> 단어 읽기</dt>
                      <dd className="mt-1 flex flex-wrap gap-1.5">
                        {readings.map((reading) => (
                          <span key={reading} className="rounded-full bg-[#f7f7f4] px-2.5 py-1 font-['Noto_Sans_JP','Noto_Sans_KR',Arial,sans-serif] text-sm font-bold">{reading}</span>
                        ))}
                      </dd>
                    </div>

                    <div>
                      <dt className="text-[11px] font-extrabold text-[var(--muted)]">외우는 단서</dt>
                      <dd className="mt-1 text-sm leading-6">
                        {card.words[0]?.word}에서 {card.kanji}가 어떻게 쓰였는지 먼저 기억하고, 같은 글자가 들어간 저장 단어를 묶어서 복습하세요.
                      </dd>
                    </div>

                    <div>
                      <dt className="text-[11px] font-extrabold text-[var(--muted)]">저장한 단어</dt>
                      <dd className="mt-2 grid gap-2">
                        {card.words.map((word) => (
                          <div key={`${card.kanji}-${word.id}`} className="rounded-2xl bg-[#f7f7f4] p-3">
                            <p className="break-words font-['Noto_Sans_JP','Noto_Sans_KR',Arial,sans-serif] font-bold">{word.word}</p>
                            <p className="mt-0.5 break-words text-xs text-[var(--muted)]">{word.reading} · {word.meaningKo}</p>
                          </div>
                        ))}
                      </dd>
                    </div>
                  </dl>
                </article>
              );
            })}
          </section>
        )}
      </div>
    </main>
  );
}
