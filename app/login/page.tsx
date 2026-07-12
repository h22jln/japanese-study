import Link from "next/link";
import { LoginForm } from "@/components/auth/login-form";

export default function LoginPage() {
  return (
    <main className="grid min-h-screen place-items-center px-4 py-6 sm:px-6">
      <section className="w-full max-w-md rounded-3xl border border-[var(--line)] bg-white p-5 shadow-sm sm:p-8">
        <Link href="/" className="text-sm font-bold">ことばノート</Link>
        <h1 className="mt-8 text-2xl font-bold tracking-tight sm:mt-10 sm:text-3xl">다시 만나서 반가워요</h1>
        <p className="mt-2 text-sm text-[var(--muted)]">학습 자료와 복습 기록을 이어서 확인하세요.</p>
        <LoginForm />
        <p className="mt-6 text-center text-sm text-[var(--muted)]">
          아직 계정이 없나요?{" "}
          <Link href="/signup" className="font-bold text-[var(--foreground)] hover:underline">회원가입</Link>
        </p>
      </section>
    </main>
  );
}
