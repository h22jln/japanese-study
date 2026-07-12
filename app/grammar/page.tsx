import Link from "next/link";
import { ArrowLeft, FileText, Sparkles } from "lucide-react";
import { redirect } from "next/navigation";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { SaveGrammarButton } from "@/components/grammar/save-grammar-button";

type SavedGrammarPoint = {
  id: string;
  grammar_point_id: string;
  saved_at: string;
  grammar_points: {
    id: string;
    pattern: string;
    meaning_ko: string;
    explanation_ko: string;
    example_ja: string | null;
    example_ko: string | null;
    documents: {
      id: string;
      title: string;
    } | null;
  };
};

export default async function GrammarPage() {
  const supabase = await createServerSupabaseClient();
  if (!supabase) redirect("/login");

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data } = await supabase
    .from("saved_grammar_points")
    .select("id,grammar_point_id,saved_at,grammar_points(id,pattern,meaning_ko,explanation_ko,example_ja,example_ko,documents(id,title))")
    .order("saved_at", { ascending: false });

  const savedGrammarPoints = (data ?? []) as unknown as SavedGrammarPoint[];

  return (
    <main className="min-h-screen overflow-x-hidden px-4 py-6 sm:px-6 sm:py-8 md:px-10">
      <div className="mx-auto max-w-5xl">
        <Link href="/dashboard" className="inline-flex items-center gap-2 text-sm font-semibold text-[var(--muted)] hover:text-[var(--foreground)]"><ArrowLeft size={16} /> 대시보드</Link>

        <header className="mt-7 flex flex-col gap-3 sm:mt-8 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="text-sm font-bold text-[var(--accent)]">문법 노트</p>
            <h1 className="mt-2 text-2xl font-bold tracking-tight sm:text-3xl md:text-4xl">저장한 문법</h1>
          </div>
          <p className="text-sm text-[var(--muted)]">{savedGrammarPoints.length}개 저장됨</p>
        </header>

        {savedGrammarPoints.length === 0 ? (
          <section className="mt-8 grid min-h-72 place-items-center rounded-3xl border border-dashed border-[#c9c9c1] bg-white/60 p-6 text-center">
            <div>
              <span className="mx-auto grid h-14 w-14 place-items-center rounded-2xl bg-[#f1eee7]"><Sparkles size={22} /></span>
              <h2 className="mt-5 text-xl font-bold">아직 저장한 문법이 없어요</h2>
              <p className="mt-2 text-sm text-[var(--muted)]">자료 상세 화면의 주요 문법에서 저장 버튼을 누르면 여기에 모입니다.</p>
            </div>
          </section>
        ) : (
          <section className="mt-8 grid gap-4 sm:mt-10">
            {savedGrammarPoints.map((saved) => {
              const grammar = saved.grammar_points;

              return (
                <article key={saved.id} className="rounded-3xl border border-[var(--line)] bg-white p-5 sm:p-6">
                  <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                    <div className="min-w-0">
                      <h2 className="break-words text-xl font-bold">{grammar.pattern}</h2>
                      <p className="mt-1 text-sm font-semibold text-[var(--accent)]">{grammar.meaning_ko}</p>
                    </div>
                    <SaveGrammarButton grammarPointId={grammar.id} userId={user.id} initialSaved />
                  </div>

                  <p className="mt-4 text-sm leading-6 text-[var(--muted)]">{grammar.explanation_ko}</p>

                  <div className="mt-5 rounded-2xl bg-[#f7f7f4] p-4">
                    <div className="mb-3 flex flex-wrap items-center gap-2 text-xs font-semibold text-[var(--muted)]">
                      <FileText size={14} />
                      {grammar.documents ? <Link href={`/documents/${grammar.documents.id}`} className="hover:underline">{grammar.documents.title}</Link> : "자료"}
                    </div>
                    {grammar.example_ja && <p className="leading-7">{grammar.example_ja}</p>}
                    {grammar.example_ko && <p className="mt-2 text-sm leading-6 text-[var(--muted)]">{grammar.example_ko}</p>}
                  </div>
                </article>
              );
            })}
          </section>
        )}
      </div>
    </main>
  );
}
