"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { isValidUsername, usernameToAuthEmail } from "@/lib/auth/username";

export function LoginForm() {
  const [message, setMessage] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const router = useRouter();

  async function signIn(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setIsLoading(true);
    setMessage("");
    const form = new FormData(event.currentTarget);
    const username = String(form.get("username"));
    const password = String(form.get("password"));
    if (!isValidUsername(username)) {
      setIsLoading(false);
      return setMessage("아이디 형식을 확인해주세요.");
    }
    const supabase = createClient();
    if (!supabase) {
      setIsLoading(false);
      return setMessage("먼저 .env.local에 Supabase 키를 설정해주세요.");
    }

    const { error } = await supabase.auth.signInWithPassword({
      email: usernameToAuthEmail(username),
      password,
    });
    setIsLoading(false);
    if (error) return setMessage("아이디 또는 비밀번호를 확인해주세요.");
    router.replace("/dashboard");
    router.refresh();
  }

  return (
    <form onSubmit={signIn} className="mt-8 space-y-4">
      <label className="block text-sm font-semibold" htmlFor="username">아이디</label>
      <input id="username" name="username" required minLength={4} maxLength={20} autoCapitalize="none" autoComplete="username" spellCheck={false} placeholder="matane_user" className="w-full rounded-xl border border-[var(--line)] px-4 py-3 outline-none focus:border-[var(--accent)]" />
      <label className="block text-sm font-semibold" htmlFor="password">비밀번호</label>
      <input id="password" name="password" type="password" required autoComplete="current-password" className="w-full rounded-xl border border-[var(--line)] px-4 py-3 outline-none focus:border-[var(--accent)]" />
      <button disabled={isLoading} className="w-full rounded-xl bg-[var(--foreground)] px-4 py-3 font-bold text-white disabled:cursor-not-allowed disabled:opacity-60">
        {isLoading ? "로그인 중..." : "로그인"}
      </button>
      {message && <p className="text-sm text-red-600" role="alert">{message}</p>}
    </form>
  );
}
