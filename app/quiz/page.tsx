import Link from "next/link";
import { ArrowLeft, Brain } from "lucide-react";
import { redirect } from "next/navigation";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { QuizSession } from "@/components/quiz/quiz-session";

type QuizWord = {
  id: string;
  dictionaryForm: string;
  reading: string;
  meaningKo: string;
  partOfSpeech: string | null;
  jlptLevel: string | null;
};

export default async function QuizPage() {
  const supabase = await createServerSupabaseClient();
  if (!supabase) redirect("/login");

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data } = await supabase
    .from("review_cards")
    .select("vocabulary(id,dictionary_form,reading,meaning_ko,part_of_speech,jlpt_level)")
    .eq("user_id", user.id)
    .order("saved_at", { ascending: false });

  const rawVocabulary = (data ?? []).flatMap((item) => {
    if (!item?.vocabulary) return [];
    return Array.isArray(item.vocabulary) ? item.vocabulary : [item.vocabulary];
  }) as Array<{
    id: string;
    dictionary_form: string;
    reading: string;
    meaning_ko: string;
    part_of_speech: string | null;
    jlpt_level: string | null;
  }>;

  const words = rawVocabulary
    .map((item) => ({
      id: item.id,
      dictionaryForm: item.dictionary_form,
      reading: item.reading,
      meaningKo: item.meaning_ko,
      partOfSpeech: item.part_of_speech,
      jlptLevel: item.jlpt_level,
    })) satisfies QuizWord[];

  return (
    <main className="min-h-screen px-4 py-4 sm:px-6 sm:py-8 md:px-10">
      <div className="mx-auto max-w-6xl">
        <Link href="/dashboard" className="inline-flex items-center gap-2 text-sm font-semibold text-[var(--muted)] hover:text-[var(--foreground)]">
          <ArrowLeft size={16} /> 대시보드
        </Link>

        <header className="mt-5 flex flex-col gap-2 sm:mt-8 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="text-sm font-bold text-[var(--accent)]">またね！</p>
            <h1 className="mt-1 text-2xl font-bold tracking-tight sm:text-3xl md:text-4xl">단어 퀴즈</h1>
            <p className="mt-2 text-sm text-[var(--muted)]">저장한 단어로 빠르게 복습해요.</p>
          </div>
          <p className="text-sm text-[var(--muted)]">{words.length}개 단어 준비됨</p>
        </header>

        {words.length === 0 ? (
          <section className="mt-8 grid min-h-72 place-items-center rounded-3xl border border-dashed border-[#c9c9c1] bg-white/60 p-6 text-center">
            <div>
              <span className="mx-auto grid h-14 w-14 place-items-center rounded-2xl bg-[#f1eee7]"><Brain size={22} /></span>
              <h2 className="mt-5 text-xl font-bold">퀴즈를 만들 단어가 아직 없어요</h2>
              <p className="mt-2 text-sm text-[var(--muted)]">먼저 단어를 저장하면 4지선다 퀴즈를 바로 풀 수 있습니다.</p>
              <Link href="/vocabulary" className="mt-5 inline-flex h-11 items-center justify-center rounded-full bg-[var(--accent)] px-5 text-sm font-semibold text-white">
                저장 단어 보러가기
              </Link>
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
