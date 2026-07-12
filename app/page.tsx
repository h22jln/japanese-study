import Link from "next/link";
import { ArrowRight, BookOpen, FileText, Sparkles } from "lucide-react";

const features = [
  { icon: FileText, title: "PDF 분석", text: "학습 자료의 핵심 내용을 한국어로 정리합니다." },
  { icon: Sparkles, title: "단어 자동 추출", text: "사전형, 읽기, 품사와 예문까지 구조화합니다." },
  { icon: BookOpen, title: "반복 복습", text: "틀린 단어를 중심으로 다시 학습합니다." },
];

export default function Home() {
  return (
    <main className="min-h-screen overflow-x-hidden px-4 py-5 sm:px-6 md:px-10">
      <nav className="mx-auto flex max-w-6xl items-center justify-between">
        <Link href="/" className="shrink-0 text-base font-bold tracking-tight sm:text-lg">ことばノート</Link>
        <div className="flex items-center gap-1 sm:gap-3">
          <Link href="/login" className="rounded-full px-3 py-2 text-sm font-medium sm:px-4">로그인</Link>
          <Link href="/dashboard" className="rounded-full bg-[var(--foreground)] px-4 py-2.5 text-sm font-semibold text-white sm:px-5">시작</Link>
        </div>
      </nav>

      <section className="mx-auto grid max-w-6xl gap-10 pb-16 pt-16 sm:pt-24 md:grid-cols-[1.15fr_.85fr] md:items-center md:pt-32">
        <div>
          <p className="mb-4 text-xs font-bold tracking-[.16em] text-[var(--accent)] sm:text-sm">AI JAPANESE REVIEW</p>
          <h1 className="max-w-3xl text-4xl font-bold leading-[1.1] tracking-[-.04em] sm:text-5xl md:text-7xl">
            읽은 자료를<br />기억할 단어로.
          </h1>
          <p className="mt-6 max-w-xl text-base leading-7 text-[var(--muted)] sm:text-lg sm:leading-8">
            일본어 PDF를 올리면 AI가 핵심 내용을 정리하고, 복습할 단어와 문법을 자동으로 만들어 드립니다.
          </p>
          <Link href="/dashboard" className="mt-8 inline-flex w-full items-center justify-center gap-2 rounded-full bg-[var(--accent)] px-6 py-3.5 font-bold text-white hover:bg-[var(--accent-dark)] sm:w-auto">
            첫 자료 올리기 <ArrowRight size={18} />
          </Link>
        </div>

        <div className="rounded-[1.5rem] border border-[var(--line)] bg-[var(--card)] p-4 shadow-[0_20px_50px_rgba(31,31,27,.1)] sm:rotate-1 sm:rounded-[2rem] sm:p-6">
          <div className="rounded-2xl bg-[#f1eee7] p-5">
            <p className="text-xs font-bold text-[var(--muted)]">오늘의 복습 · N3</p>
            <p className="mt-7 break-words text-3xl font-bold sm:text-4xl">振り返る</p>
            <p className="mt-2 text-sm text-[var(--muted)]">ふりかえる · 동사</p>
            <div className="mt-8 rounded-xl bg-white p-4">
              <p className="font-medium">過去を振り返ってみる。</p>
              <p className="mt-2 text-sm text-[var(--muted)]">과거를 되돌아보다.</p>
            </div>
          </div>
          <div className="mt-5 flex justify-between text-sm">
            <span className="text-[var(--muted)]">이번 주 학습</span><strong>42개 단어</strong>
          </div>
        </div>
      </section>

      <section className="mx-auto grid max-w-6xl gap-4 pb-20 md:grid-cols-3">
        {features.map(({ icon: Icon, title, text }) => (
          <article key={title} className="rounded-2xl border border-[var(--line)] bg-white p-6">
            <Icon className="text-[var(--accent)]" size={22} />
            <h2 className="mt-5 font-bold">{title}</h2>
            <p className="mt-2 text-sm leading-6 text-[var(--muted)]">{text}</p>
          </article>
        ))}
      </section>
    </main>
  );
}
