import { BookOpen, FileText, Sparkles } from "lucide-react";
import { redirect } from "next/navigation";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { PdfUploadButton } from "@/components/documents/pdf-upload-button";
import { AnalyzeButton } from "@/components/documents/analyze-button";
import { DocumentStatusRefresher } from "@/components/documents/document-status-refresher";
import Link from "next/link";

type DocumentItem = {
  id: string;
  title: string;
  status: "queued" | "processing" | "completed" | "failed";
  created_at: string;
};

const statusLabels: Record<DocumentItem["status"], string> = {
  queued: "분석 대기",
  processing: "분석 중",
  completed: "분석 완료",
  failed: "분석 실패",
};

export default async function DashboardPage() {
  const supabase = await createServerSupabaseClient();
  let documents: DocumentItem[] = [];
  let vocabularyCount = 0;
  let grammarCount = 0;

  // 환경변수 설정 전에는 UI 미리보기를 허용하고, 연결 후에는 인증을 강제합니다.
  if (supabase) {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) redirect("/login");

    const [{ data }, { count }, { count: savedGrammarCount }] = await Promise.all([
      supabase.from("documents").select("id,title,status,created_at").order("created_at", { ascending: false }),
      supabase.from("review_cards").select("id", { count: "exact", head: true }),
      supabase.from("saved_grammar_points").select("id", { count: "exact", head: true }),
    ]);
    documents = (data ?? []) as DocumentItem[];
    vocabularyCount = count ?? 0;
    grammarCount = savedGrammarCount ?? 0;
  }

  return (
    <main className="min-h-screen overflow-x-hidden px-4 py-6 sm:px-6 sm:py-8 md:px-10">
      <div className="mx-auto max-w-6xl">
        <DocumentStatusRefresher active={documents.some((document) => document.status === "processing")} />
        <header className="flex flex-col gap-5 sm:flex-row sm:items-start sm:justify-between">
          <div><p className="text-sm text-[var(--muted)]">ことばノート</p><h1 className="mt-1 text-2xl font-bold sm:text-3xl">내 학습 자료</h1></div>
          <PdfUploadButton />
        </header>

        <section className="mt-8 grid grid-cols-2 gap-2 sm:mt-10 sm:grid-cols-4 sm:gap-5">
          <div className="min-w-0 rounded-2xl border border-[var(--line)] bg-white p-3 sm:p-6"><FileText size={18} /><p className="mt-4 truncate text-[11px] text-[var(--muted)] sm:mt-6 sm:text-sm">업로드 자료</p><strong className="mt-1 block text-2xl sm:text-3xl">{documents.length}</strong></div>
          <Link href="/vocabulary" className="min-w-0 rounded-2xl border border-[var(--line)] bg-white p-3 transition hover:border-[var(--accent)] sm:p-6"><BookOpen size={18} /><p className="mt-4 truncate text-[11px] text-[var(--muted)] sm:mt-6 sm:text-sm">저장 단어</p><strong className="mt-1 block text-2xl sm:text-3xl">{vocabularyCount}</strong></Link>
          <Link href="/grammar" className="min-w-0 rounded-2xl border border-[var(--line)] bg-white p-3 transition hover:border-[var(--accent)] sm:p-6"><Sparkles size={18} /><p className="mt-4 truncate text-[11px] text-[var(--muted)] sm:mt-6 sm:text-sm">저장 문법</p><strong className="mt-1 block text-2xl sm:text-3xl">{grammarCount}</strong></Link>
          <div className="min-w-0 rounded-2xl border border-[var(--line)] bg-white p-3 sm:p-6"><span className="text-lg sm:text-xl">連</span><p className="mt-4 truncate text-[11px] text-[var(--muted)] sm:mt-6 sm:text-sm">연속 학습</p><strong className="mt-1 block text-2xl sm:text-3xl">0일</strong></div>
        </section>

        {documents.length === 0 ? (
          <section className="mt-6 grid min-h-64 place-items-center rounded-3xl border border-dashed border-[#c9c9c1] bg-white/60 p-5 text-center sm:mt-8 sm:min-h-72 sm:p-8">
            <div><span className="mx-auto grid h-14 w-14 place-items-center rounded-2xl bg-[#f1eee7]"><FileText size={22} /></span><h2 className="mt-5 text-xl font-bold">첫 PDF를 올려보세요</h2><p className="mt-2 text-sm text-[var(--muted)]">20MB 이하의 일본어 학습 자료를 업로드할 수 있습니다.</p><PdfUploadButton variant="empty" /></div>
          </section>
        ) : (
          <section className="mt-8 overflow-hidden rounded-3xl border border-[var(--line)] bg-white">
            <div className="border-b border-[var(--line)] px-4 py-4 sm:px-6 sm:py-5"><h2 className="font-bold">최근 자료</h2></div>
            <ul className="divide-y divide-[var(--line)]">
              {documents.map((document) => (
                <li key={document.id} className="flex flex-col items-stretch gap-4 px-4 py-4 sm:flex-row sm:items-center sm:justify-between sm:px-6 sm:py-5">
                  <div className="flex min-w-0 items-center gap-3 sm:gap-4">
                    <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-[#f1eee7] sm:h-11 sm:w-11"><FileText size={19} /></span>
                    <div className="min-w-0"><Link href={`/documents/${document.id}`} className="truncate font-semibold hover:underline">{document.title}</Link><p className="mt-1 text-xs text-[var(--muted)]">{new Intl.DateTimeFormat("ko-KR", { dateStyle: "medium" }).format(new Date(document.created_at))}</p></div>
                  </div>
                  <div className="flex shrink-0 items-center justify-between gap-3 pl-[52px] text-left sm:block sm:pl-0 sm:text-right">
                    <span className="inline-block rounded-full bg-[#f1eee7] px-3 py-1.5 text-xs font-semibold text-[var(--muted)]">{statusLabels[document.status]}</span>
                    {(document.status === "queued" || document.status === "failed") && <div className="sm:mt-2"><AnalyzeButton documentId={document.id} /></div>}
                  </div>
                </li>
              ))}
            </ul>
          </section>
        )}
      </div>
    </main>
  );
}
