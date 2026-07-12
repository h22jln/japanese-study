import Link from "next/link";
import { ArrowLeft, BookOpen } from "lucide-react";
import { redirect } from "next/navigation";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { SaveVocabularyButton } from "@/components/vocabulary/save-vocabulary-button";
import { formatPartOfSpeech } from "@/lib/dictionary/format-part-of-speech";

type SavedCard = {
  id: string;
  vocabulary_id: string;
  saved_at: string | null;
  vocabulary: {
    id: string;
    dictionary_form: string;
    reading: string;
    meaning_ko: string;
    part_of_speech: string | null;
    jlpt_level: string | null;
  };
};

export default async function VocabularyPage() {
  const supabase = await createServerSupabaseClient();
  if (!supabase) redirect("/login");

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: cards } = await supabase
    .from("review_cards")
    .select("id,vocabulary_id,saved_at,vocabulary(id,dictionary_form,reading,meaning_ko,part_of_speech,jlpt_level)")
    .order("saved_at", { ascending: false });

  const savedCards = (cards ?? []) as unknown as SavedCard[];

  return (
    <main className="min-h-screen overflow-x-hidden px-4 py-6 sm:px-6 sm:py-8 md:px-10">
      <div className="mx-auto max-w-6xl">
        <Link href="/dashboard" className="inline-flex items-center gap-2 text-sm font-semibold text-[var(--muted)] hover:text-[var(--foreground)]"><ArrowLeft size={16} /> 대시보드</Link>

        <header className="mt-7 flex flex-col gap-3 sm:mt-8 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="text-sm font-bold text-[var(--accent)]">またね！</p>
            <h1 className="mt-2 text-2xl font-bold tracking-tight sm:text-3xl md:text-4xl">저장한 단어</h1>
          </div>
          <p className="text-sm text-[var(--muted)]">{savedCards.length}개 저장됨</p>
        </header>

        {savedCards.length === 0 ? (
          <section className="mt-8 grid min-h-72 place-items-center rounded-3xl border border-dashed border-[#c9c9c1] bg-white/60 p-6 text-center">
            <div>
              <span className="mx-auto grid h-14 w-14 place-items-center rounded-2xl bg-[#f1eee7]"><BookOpen size={22} /></span>
              <h2 className="mt-5 text-xl font-bold">아직 저장한 단어가 없어요</h2>
              <p className="mt-2 text-sm text-[var(--muted)]">자료 상세 화면의 단어 옆 버튼을 눌러 단어장에 담을 수 있습니다.</p>
            </div>
          </section>
        ) : (
          <section className="mt-8 grid gap-4 sm:mt-10">
            {savedCards.map((card) => (
              <article key={card.id} className="rounded-3xl border border-[var(--line)] bg-white p-5 sm:p-6">
                <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                  <div className="min-w-0">
                    {(() => {
                      const partOfSpeech = formatPartOfSpeech(card.vocabulary.part_of_speech);

                      return (
                        <>
                          <div className="flex flex-wrap items-center gap-2">
                            <h2 className="break-words text-xl font-bold">{card.vocabulary.dictionary_form}</h2>
                            {card.vocabulary.jlpt_level && <span className="rounded-full bg-[#f1eee7] px-2 py-0.5 text-[10px] font-bold">{card.vocabulary.jlpt_level}</span>}
                          </div>
                          <p className="mt-1 break-words text-sm text-[var(--muted)]">{card.vocabulary.reading}{partOfSpeech ? ` · ${partOfSpeech}` : ""}</p>
                          <p className="mt-3 text-base font-semibold">{card.vocabulary.meaning_ko}</p>
                        </>
                      );
                    })()}
                  </div>
                  <SaveVocabularyButton vocabularyId={card.vocabulary.id} userId={user.id} initialSaved />
                </div>
              </article>
            ))}
          </section>
        )}
      </div>
    </main>
  );
}
