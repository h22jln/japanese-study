import Link from "next/link";
import { SignupForm } from "@/components/auth/signup-form";

export default function SignupPage() {
  return (
    <main className="grid min-h-screen place-items-center px-4 py-6 sm:px-6 sm:py-10">
      <section className="w-full max-w-md rounded-3xl border border-[var(--line)] bg-white p-5 shadow-sm sm:p-8">
        <Link href="/" className="text-2xl font-bold tracking-tight">またね！</Link>
        <h1 className="mt-8 text-2xl font-bold tracking-tight sm:mt-10 sm:text-3xl">학습을 시작해볼까요?</h1>
        <p className="mt-2 text-sm text-[var(--muted)]">아이디와 비밀번호로 계정을 만들고 학습을 시작하세요.</p>
        <SignupForm />
        <p className="mt-6 text-center text-sm text-[var(--muted)]">
          이미 계정이 있나요?{" "}
          <Link href="/login" className="font-bold text-[var(--foreground)] hover:underline">로그인</Link>
        </p>
      </section>
    </main>
  );
}
