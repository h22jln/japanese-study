import Link from "next/link";
import { ArrowLeft, BookOpen, FileText, Sparkles } from "lucide-react";
import { notFound, redirect } from "next/navigation";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { AnalyzeButton } from "@/components/documents/analyze-button";
import { DocumentStatusRefresher } from "@/components/documents/document-status-refresher";
import { DocumentTitleForm } from "@/components/documents/document-title-form";
import { HighlightedBody } from "@/components/documents/highlighted-body";
import { PinDocumentButton } from "@/components/documents/pin-document-button";
import { DeleteDocumentButton } from "@/components/documents/delete-document-button";
import { SaveVocabularyButton } from "@/components/vocabulary/save-vocabulary-button";
import { SaveGrammarButton } from "@/components/grammar/save-grammar-button";
import { formatPartOfSpeech } from "@/lib/dictionary/format-part-of-speech";

type VocabularyLink = {
  surface_form: string | null;
  example_ja: string | null;
  example_ko: string | null;
  source_page: number | null;
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

type GrammarPoint = {
  id: string;
  pattern: string;
  meaning_ko: string;
  explanation_ko: string;
  example_ja: string | null;
  example_ko: string | null;
};

type DocumentNote = {
  id: string;
  line_index: number;
  selected_text: string;
  note_text: string;
  start_offset: number | null;
  end_offset: number | null;
  created_at: string;
  updated_at: string;
};

const grammarSectionLabels = ["접속", "뉘앙스", "사용 상황", "주의", "설명"];

function parseGrammarExplanation(value: string) {
  const lines = value.split(/\n+/).map((line) => line.trim()).filter(Boolean);
  const sections: Array<{ label: string; text: string }> = [];
  const rest: string[] = [];

  for (const line of lines) {
    const match = line.match(/^(접속|뉘앙스|사용\s*상황|주의|설명)\s*[:：-]\s*(.+)$/);
    if (!match) {
      rest.push(line.replace(/^[-•]\s*/, ""));
      continue;
    }

    const label = match[1].replace(/\s+/g, "").replace("사용상황", "사용 상황");
    sections.push({ label, text: match[2].trim() });
  }

  if (sections.length === 0 && rest.length > 0) return [{ label: "설명", text: rest.join(" ") }];
  if (rest.length > 0) sections.push({ label: "설명", text: rest.join(" ") });

  return grammarSectionLabels
    .map((label) => sections.find((section) => section.label === label))
    .filter((section): section is { label: string; text: string } => Boolean(section));
}

export default async function DocumentPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createServerSupabaseClient();
  if (!supabase) redirect("/login");

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const [{ data: document }, { data: words }, { data: grammarPoints }, { data: savedCards }, { data: savedGrammarPoints }, { data: notes }] = await Promise.all([
    supabase.from("documents").select("id,title,status,body_lines,body_line_translations,summary_ko,error_message,created_at,pinned_at").eq("id", id).single(),
    supabase.from("document_vocabulary").select("surface_form,example_ja,example_ko,source_page,source,vocabulary(id,dictionary_form,reading,meaning_ko,part_of_speech,jlpt_level)").eq("document_id", id),
    supabase.from("grammar_points").select("id,pattern,meaning_ko,explanation_ko,example_ja,example_ko").eq("document_id", id).order("created_at"),
    supabase.from("review_cards").select("vocabulary_id"),
    supabase.from("saved_grammar_points").select("grammar_point_id"),
    supabase.from("document_notes").select("id,line_index,selected_text,note_text,start_offset,end_offset,created_at,updated_at").eq("document_id", id).order("line_index").order("created_at"),
  ]);
  if (!document) notFound();

  const isPending = document.status === "queued" || document.status === "processing";
  const vocabularyWords = (words ?? []) as unknown as VocabularyLink[];
  const grammarItems = (grammarPoints ?? []) as GrammarPoint[];
  const bodyLines = (document.body_lines ?? []) as Array<string | { japanese: string }>;
  const documentNotes = (notes ?? []) as DocumentNote[];
  const cachedTranslations = document.body_line_translations && typeof document.body_line_translations === "object"
    ? document.body_line_translations as Record<string, string>
    : {};
  const savedVocabularyIds = new Set((savedCards ?? []).map((card) => card.vocabulary_id));
  const savedGrammarPointIds = new Set((savedGrammarPoints ?? []).map((card) => card.grammar_point_id));

  return (
    <main className="min-h-screen px-4 py-6 sm:px-6 sm:py-8 md:px-10">
      <DocumentStatusRefresher active={isPending} />
      <div className="mx-auto max-w-7xl">
        <Link href="/dashboard" className="inline-flex items-center gap-2 text-sm font-semibold text-[var(--muted)] hover:text-[var(--foreground)]"><ArrowLeft size={16} /> 자료 목록</Link>
        <header className="mt-7 flex flex-col gap-5 sm:mt-8 sm:flex-row sm:items-start sm:justify-between">
          <div className="min-w-0"><p className="text-sm font-bold text-[var(--accent)]">일본어 학습 자료</p><div className="mt-2"><DocumentTitleForm documentId={document.id} initialTitle={document.title} /></div></div>
          <div className="flex items-center gap-2 self-start">
            <PinDocumentButton documentId={document.id} initialPinned={Boolean(document.pinned_at)} />
            <DeleteDocumentButton documentId={document.id} redirectTo="/dashboard" />
            {(document.status === "queued" || document.status === "failed" || bodyLines.length === 0) && <AnalyzeButton documentId={document.id} />}
          </div>
        </header>

        {document.status !== "completed" ? (
          <section className="mt-8 grid min-h-64 place-items-center rounded-3xl border border-[var(--line)] bg-white p-5 text-center sm:mt-10 sm:p-8">
            <div><Sparkles className="mx-auto text-[var(--accent)]" /><h2 className="mt-4 text-xl font-bold">{document.status === "processing" ? "AI가 자료를 분석하고 있어요" : document.status === "failed" ? "분석을 완료하지 못했어요" : "분석을 기다리고 있어요"}</h2><p className="mt-2 max-w-lg text-sm leading-6 text-[var(--muted)]">{document.error_message ?? (document.status === "processing" ? "PDF 분량에 따라 몇 분 정도 걸릴 수 있습니다. 이 화면은 자동으로 갱신됩니다." : "AI 분석 버튼을 눌러 분석을 시작해주세요.")}</p></div>
          </section>
        ) : (
          <div className="mt-8 grid items-start gap-5 sm:mt-10 sm:grid-cols-[260px_minmax(0,1fr)] sm:gap-6 lg:grid-cols-[280px_minmax(0,1fr)] lg:gap-7">
            <aside className="order-2 rounded-3xl border border-[var(--line)] bg-white p-5 sm:order-1 sm:sticky sm:top-6 sm:flex sm:max-h-[calc(100vh-3rem)] sm:self-start sm:flex-col sm:overflow-hidden">
              <div className="flex items-center justify-between"><div className="flex items-center gap-2"><BookOpen size={18} className="text-[var(--accent)]" /><h2 className="font-bold">추출 단어</h2></div><span className="text-xs text-[var(--muted)]">{vocabularyWords.length}개</span></div>
              <div className="mt-5 grid gap-2 sm:min-h-0 sm:grid-cols-1 sm:overflow-y-auto sm:pr-1">
                {vocabularyWords.map((word, index) => (
                  <article
                    id={`vocab-card-${word.vocabulary.id}`}
                    key={`${word.vocabulary.dictionary_form}-${index}`}
                    className="vocab-card min-w-0 scroll-mt-28 rounded-xl bg-[#f7f7f4] p-3.5 transition"
                  >
                    {(() => {
                      const partOfSpeech = formatPartOfSpeech(word.vocabulary.part_of_speech);

                      return (
                        <>
                          <div className="flex items-start justify-between gap-2">
                            <div className="min-w-0"><h3 className="break-words font-bold">{word.vocabulary.dictionary_form}</h3><p className="mt-0.5 break-words text-xs text-[var(--muted)]">{word.vocabulary.reading}{partOfSpeech ? ` · ${partOfSpeech}` : ""}</p></div>
                            <div className="flex shrink-0 items-center gap-1.5">
                              {word.vocabulary.jlpt_level && <span className="rounded-full bg-white px-2 py-0.5 text-[10px] font-bold">{word.vocabulary.jlpt_level}</span>}
                              <SaveVocabularyButton vocabularyId={word.vocabulary.id} userId={user.id} initialSaved={savedVocabularyIds.has(word.vocabulary.id)} compact />
                            </div>
                          </div>
                          <p className="mt-2 text-sm font-semibold">{word.vocabulary.meaning_ko}</p>
                        </>
                      );
                    })()}
                  </article>
                ))}
              </div>
            </aside>

            <div className="order-1 min-w-0 sm:order-2">
              <section className="rounded-3xl border border-[var(--line)] bg-white p-5 sm:p-7 md:p-10">
                <div className="flex items-center gap-2"><FileText size={19} className="text-[var(--accent)]" /><h2 className="font-bold">본문</h2></div>
                <p className="mt-2 text-xs text-[var(--muted)]">표시된 단어에 마우스를 올리거나 선택하면 뜻을 볼 수 있고, 각 줄의 해석은 버튼을 눌렀을 때만 열립니다.</p>
                <div className="mt-8">
                  {bodyLines.length > 0 ? <HighlightedBody documentId={document.id} words={vocabularyWords} lines={bodyLines} initialTranslations={cachedTranslations} initialSummary={document.summary_ko} initialNotes={documentNotes} /> : <div className="rounded-2xl bg-[#f7f7f4] p-6 text-center text-sm text-[var(--muted)]">이 자료에는 추출된 본문이 없습니다. 상단의 AI 분석 버튼으로 다시 분석해주세요.</div>}
                </div>
              </section>

              {grammarItems.length > 0 && <section className="mt-5 rounded-3xl border border-[var(--line)] bg-white p-5 sm:mt-6 sm:p-7 md:p-9">
                <div className="flex items-center justify-between gap-3">
                  <div className="flex items-center gap-2"><Sparkles size={19} className="text-[var(--accent)]" /><h2 className="font-bold">주요 문법</h2></div>
                  <Link href="/grammar" className="text-xs font-bold text-[var(--muted)] hover:text-[var(--foreground)]">저장 문법 보기</Link>
                </div>
                <div className="mt-6 space-y-4">
                  {grammarItems.map((grammar) => (
                    <article key={grammar.id} className="rounded-2xl border border-[var(--line)] p-4 sm:p-5">
                      {(() => {
                        const explanationSections = parseGrammarExplanation(grammar.explanation_ko);

                        return (
                          <>
                            <div className="flex items-start justify-between gap-3">
                              <div className="min-w-0">
                                <h3 className="break-words text-xl font-extrabold leading-snug text-[var(--foreground)] sm:text-2xl">{grammar.pattern}</h3>
                                <p className="mt-2 text-sm font-bold text-[var(--accent)] sm:text-base">{grammar.meaning_ko}</p>
                              </div>
                              <SaveGrammarButton grammarPointId={grammar.id} userId={user.id} initialSaved={savedGrammarPointIds.has(grammar.id)} />
                            </div>

                            {explanationSections.length > 0 && (
                              <dl className="mt-5 grid gap-2 sm:grid-cols-3">
                                {explanationSections.map((section) => (
                                  <div key={section.label} className="min-w-0 rounded-xl bg-[#f7f7f4] p-3">
                                    <dt className="text-[11px] font-extrabold text-[var(--accent)]">{section.label}</dt>
                                    <dd className="mt-1 break-words text-sm leading-6 text-[var(--muted)]">{section.text}</dd>
                                  </div>
                                ))}
                              </dl>
                            )}

                            {grammar.example_ja && (
                              <div className="mt-4 rounded-xl border border-[var(--line)] bg-white p-4 text-sm">
                                <p className="text-[11px] font-extrabold text-[var(--muted)]">예문</p>
                                <p className="mt-2 break-words text-base font-bold leading-7 text-[var(--foreground)]">{grammar.example_ja}</p>
                                <p className="mt-1 break-words leading-6 text-[var(--muted)]">{grammar.example_ko}</p>
                              </div>
                            )}

                            <div className="mt-4 rounded-xl bg-[#fff8ec] p-4 text-sm">
                              <p className="text-[11px] font-extrabold text-[var(--accent)]">직접 써보기</p>
                              <p className="mt-1 break-words leading-6 text-[var(--muted)]">{grammar.pattern}를 사용해서 내 상황에 맞는 문장을 하나 만들어보세요.</p>
                            </div>
                          </>
                        );
                      })()}
                    </article>
                  ))}
                </div>
              </section>}
            </div>
          </div>
        )}
      </div>
    </main>
  );
}
