import Link from "next/link";
import { ArrowLeft, Sparkles } from "lucide-react";
import { revalidatePath } from "next/cache";
import { notFound, redirect } from "next/navigation";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { analyzeDocumentKanji } from "@/lib/ai/analyze-kanji";

type KanjiCard = {
  id: string;
  kanji: string;
  readings: string[];
  meaning_ko: string;
  radical: string | null;
  mnemonic_ko: string;
  example_words: Array<{ word: string; reading: string; meaningKo: string }>;
};

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

  const { data: kanjiCards } = await supabase
    .from("document_kanji")
    .select("id,kanji,readings,meaning_ko,radical,mnemonic_ko,example_words")
    .eq("document_id", id)
    .order("kanji");

  async function generateKanjiStudy() {
    "use server";

    const actionSupabase = await createServerSupabaseClient();
    if (!actionSupabase) redirect("/login");
    const { data: { user: actionUser } } = await actionSupabase.auth.getUser();
    if (!actionUser) redirect("/login");

    await analyzeDocumentKanji({ documentId: id, userId: actionUser.id });
    revalidatePath(`/documents/${id}/kanji`);
  }

  const cards = (kanjiCards ?? []) as KanjiCard[];

  return (
    <main className="min-h-screen px-4 py-6 sm:px-6 sm:py-8 md:px-10">
      <div className="mx-auto max-w-6xl">
        <Link href={`/documents/${document.id}`} className="inline-flex items-center gap-2 text-sm font-semibold text-[var(--muted)] hover:text-[var(--foreground)]">
          <ArrowLeft size={16} /> 자료로 돌아가기
        </Link>

        <header className="mt-7 flex flex-col gap-4 sm:mt-8 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="text-sm font-bold text-[var(--accent)]">자료별 한자 학습</p>
            <h1 className="mt-2 break-words text-2xl font-bold tracking-tight sm:text-3xl md:text-4xl">{document.title}</h1>
            <p className="mt-2 text-sm leading-6 text-[var(--muted)]">이 자료에 나온 한자의 읽는 법, 뜻, 부수, 외우는 힌트를 모았습니다.</p>
          </div>
          <form action={generateKanjiStudy}>
            <button className="inline-flex min-h-11 items-center justify-center gap-2 rounded-full bg-[var(--accent)] px-5 text-sm font-bold text-white transition hover:bg-[var(--accent-dark)]">
              <Sparkles size={16} /> {cards.length > 0 ? "한자 다시 분석" : "한자 분석"}
            </button>
          </form>
        </header>

        {cards.length === 0 ? (
          <section className="mt-8 grid min-h-72 place-items-center rounded-3xl border border-dashed border-[#c9c9c1] bg-white/60 p-6 text-center">
            <div>
              <Sparkles className="mx-auto text-[var(--accent)]" />
              <h2 className="mt-5 text-xl font-bold">아직 한자 카드가 없어요</h2>
              <p className="mt-2 text-sm leading-6 text-[var(--muted)]">한자 분석 버튼을 누르면 이 자료 단어와 본문을 기준으로 학습 카드를 만듭니다.</p>
            </div>
          </section>
        ) : (
          <section className="mt-8 grid gap-3 sm:mt-10 sm:grid-cols-2 xl:grid-cols-3">
            {cards.map((card) => (
              <article key={card.id} className="rounded-3xl border border-[var(--line)] bg-white p-5">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <p className="font-['Noto_Sans_JP','Noto_Sans_KR',Arial,sans-serif] text-5xl font-black leading-none">{card.kanji}</p>
                    <p className="mt-3 text-sm font-bold text-[var(--accent)]">{card.meaning_ko}</p>
                  </div>
                  {card.radical && <span className="shrink-0 rounded-full bg-[#f1eee7] px-3 py-1 text-xs font-bold text-[var(--muted)]">부수 {card.radical}</span>}
                </div>

                <dl className="mt-5 space-y-4">
                  <div>
                    <dt className="text-[11px] font-extrabold text-[var(--muted)]">읽는 법</dt>
                    <dd className="mt-1 flex flex-wrap gap-1.5">
                      {card.readings.map((reading) => (
                        <span key={reading} className="rounded-full bg-[#f7f7f4] px-2.5 py-1 font-['Noto_Sans_JP','Noto_Sans_KR',Arial,sans-serif] text-sm font-bold">{reading}</span>
                      ))}
                    </dd>
                  </div>

                  <div>
                    <dt className="text-[11px] font-extrabold text-[var(--muted)]">쉽게 외우는 법</dt>
                    <dd className="mt-1 text-sm leading-6">{card.mnemonic_ko}</dd>
                  </div>

                  {card.example_words.length > 0 && (
                    <div>
                      <dt className="text-[11px] font-extrabold text-[var(--muted)]">자료 속 단어</dt>
                      <dd className="mt-2 grid gap-2">
                        {card.example_words.map((word) => (
                          <div key={`${card.kanji}-${word.word}-${word.reading}`} className="rounded-2xl bg-[#f7f7f4] p-3">
                            <p className="break-words font-['Noto_Sans_JP','Noto_Sans_KR',Arial,sans-serif] font-bold">{word.word}</p>
                            <p className="mt-0.5 break-words text-xs text-[var(--muted)]">{word.reading} · {word.meaningKo}</p>
                          </div>
                        ))}
                      </dd>
                    </div>
                  )}
                </dl>
              </article>
            ))}
          </section>
        )}
      </div>
    </main>
  );
}
