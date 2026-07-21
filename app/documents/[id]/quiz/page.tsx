import Link from "next/link";
import { ArrowLeft, Brain } from "lucide-react";
import { notFound, redirect } from "next/navigation";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { QuizSession } from "@/components/quiz/quiz-session";

type QuizWord = {
  id: string;
  dictionaryForm: string;
  reading: string;
  meaningKo: string;
  partOfSpeech: string | null;
  jlptLevel: string | null;
  confusionCount: number;
};

type DocumentVocabulary = {
  source: "analysis" | "user_lookup" | null;
  vocabulary: {
    id: string;
    dictionary_form: string;
    reading: string;
    meaning_ko: string;
    part_of_speech: string | null;
    jlpt_level: string | null;
  };
};

export default async function DocumentQuizPage({ params }: { params: Promise<{ id: string }> }) {
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

  const { data: linksWithSource, error: linksWithSourceError } = await supabase
    .from("document_vocabulary")
    .select("source,vocabulary(id,dictionary_form,reading,meaning_ko,part_of_speech,jlpt_level)")
    .eq("document_id", id);
  const { data: linksWithoutSource } = linksWithSourceError
    ? await supabase
        .from("document_vocabulary")
        .select("vocabulary(id,dictionary_form,reading,meaning_ko,part_of_speech,jlpt_level)")
        .eq("document_id", id)
    : { data: null };

  const links = (linksWithSourceError ? linksWithoutSource : linksWithSource) ?? [];
  const vocabularyIds = links.flatMap((item) => {
    const vocabulary = Array.isArray(item.vocabulary) ? item.vocabulary[0] : item.vocabulary;
    return vocabulary?.id ? [vocabulary.id] : [];
  });
  const { data: cards } = vocabularyIds.length > 0
    ? await supabase
        .from("review_cards")
        .select("vocabulary_id,confusion_count")
        .eq("user_id", user.id)
        .in("vocabulary_id", vocabularyIds)
    : { data: [] };
  const confusionByVocabularyId = new Map((cards ?? []).map((card) => [card.vocabulary_id, card.confusion_count ?? 0]));

  const words = (links as unknown as DocumentVocabulary[])
    .flatMap((item) => {
      const vocabulary = Array.isArray(item.vocabulary) ? item.vocabulary[0] : item.vocabulary;
      if (!vocabulary) return [];

      return [{
        id: vocabulary.id,
        dictionaryForm: vocabulary.dictionary_form,
        reading: vocabulary.reading,
        meaningKo: vocabulary.meaning_ko,
        partOfSpeech: vocabulary.part_of_speech,
        jlptLevel: vocabulary.jlpt_level,
        confusionCount: (confusionByVocabularyId.get(vocabulary.id) ?? 0) + (item.source === "user_lookup" ? 1 : 0),
      }];
    })
    .sort((a, b) => b.confusionCount - a.confusionCount) satisfies QuizWord[];

  return (
    <main className="min-h-screen px-4 py-4 sm:px-6 sm:py-8 md:px-10">
      <div className="mx-auto max-w-6xl">
        <Link href={`/documents/${document.id}`} className="inline-flex items-center gap-2 text-sm font-semibold text-[var(--muted)] hover:text-[var(--foreground)]">
          <ArrowLeft size={16} /> 자료로 돌아가기
        </Link>

        <header className="mt-5 flex flex-col gap-2 sm:mt-8 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="text-sm font-bold text-[var(--accent)]">자료별 퀴즈</p>
            <h1 className="mt-1 break-words text-2xl font-bold tracking-tight sm:text-3xl md:text-4xl">{document.title}</h1>
            <p className="mt-2 text-sm text-[var(--muted)]">이 자료에서 나온 단어만 빠르게 복습해요.</p>
          </div>
          <p className="text-sm text-[var(--muted)]">{words.length}개 단어 준비됨</p>
        </header>

        {words.length === 0 ? (
          <section className="mt-8 grid min-h-72 place-items-center rounded-3xl border border-dashed border-[#c9c9c1] bg-white/60 p-6 text-center">
            <div>
              <span className="mx-auto grid h-14 w-14 place-items-center rounded-2xl bg-[#f1eee7]"><Brain size={22} /></span>
              <h2 className="mt-5 text-xl font-bold">이 자료에 퀴즈 단어가 없어요</h2>
              <p className="mt-2 text-sm text-[var(--muted)]">AI 분석을 다시 돌리거나, 본문에서 모르는 단어를 드래그해 저장해보세요.</p>
            </div>
          </section>
        ) : (
          <section className="mt-5 sm:mt-10">
            <QuizSession words={words} />
          </section>
        )}
      </div>
    </main>
  );
}
