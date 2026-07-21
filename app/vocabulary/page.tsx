import Link from "next/link";
import { ArrowLeft, BookOpen } from "lucide-react";
import { redirect } from "next/navigation";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { VocabularyStudyList } from "@/components/vocabulary/vocabulary-study-list";

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

function groupCardsBySavedDate(cards: SavedCard[]) {
  const formatter = new Intl.DateTimeFormat("ko-KR", { dateStyle: "long" });
  const groups = new Map<string, SavedCard[]>();

  for (const card of cards) {
    const key = card.saved_at ? formatter.format(new Date(card.saved_at)) : "날짜 미상";
    const existing = groups.get(key);
    if (existing) {
      existing.push(card);
    } else {
      groups.set(key, [card]);
    }
  }

  return [...groups.entries()];
}

export default async function VocabularyPage() {
  const supabase = await createServerSupabaseClient();
  if (!supabase) redirect("/login");

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: cards } = await supabase
    .from("review_cards")
    .select("id,vocabulary_id,saved_at,confusion_count,last_confused_at,vocabulary(id,dictionary_form,reading,meaning_ko,part_of_speech,jlpt_level)")
    .order("confusion_count", { ascending: false })
    .order("saved_at", { ascending: false });

  const savedCards = (cards ?? []) as unknown as SavedCard[];
  const groupedCards = groupCardsBySavedDate(savedCards);

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
          <VocabularyStudyList groupedCards={groupedCards} userId={user.id} />
        )}
      </div>
    </main>
  );
}
