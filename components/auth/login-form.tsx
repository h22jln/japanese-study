"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { isValidUsername, usernameToAuthEmails } from "@/lib/auth/username";

const SAVED_USERNAME_KEY = "matane.saved_username";

export function LoginForm() {
  const [message, setMessage] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [username, setUsername] = useState(() => typeof window === "undefined" ? "" : (window.localStorage.getItem(SAVED_USERNAME_KEY) ?? ""));
  const [rememberUsername, setRememberUsername] = useState(() => typeof window !== "undefined" && Boolean(window.localStorage.getItem(SAVED_USERNAME_KEY)));
  const router = useRouter();

  async function signIn(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setIsLoading(true);
    setMessage("");
    const form = new FormData(event.currentTarget);
    const currentUsername = String(form.get("username"));
    const password = String(form.get("password"));
    if (!isValidUsername(currentUsername)) {
      setIsLoading(false);
      return setMessage("아이디 형식을 확인해주세요.");
    }
    const supabase = createClient();
    if (!supabase) {
      setIsLoading(false);
      return setMessage("먼저 .env.local에 Supabase 키를 설정해주세요.");
    }

    if (rememberUsername) {
      window.localStorage.setItem(SAVED_USERNAME_KEY, currentUsername);
    } else {
      window.localStorage.removeItem(SAVED_USERNAME_KEY);
    }

    let signInError: string | null = null;
    for (const email of usernameToAuthEmails(currentUsername)) {
      const { error } = await supabase.auth.signInWithPassword({ email, password });
      if (!error) {
        setIsLoading(false);
        router.replace("/dashboard");
        router.refresh();
        return;
      }
      signInError = error.message;
    }

    setIsLoading(false);
    if (signInError) return setMessage("아이디 또는 비밀번호를 확인해주세요.");
  }

  return (
    <form onSubmit={signIn} className="mt-8 space-y-4">
      <label className="block text-sm font-semibold" htmlFor="username">아이디</label>
      <input id="username" name="username" value={username} onChange={(event) => setUsername(event.target.value)} required minLength={4} maxLength={20} autoCapitalize="none" autoComplete="username" spellCheck={false} placeholder="matane_user" className="w-full rounded-xl border border-[var(--line)] px-4 py-3 outline-none focus:border-[var(--accent)]" />
      <label className="block text-sm font-semibold" htmlFor="password">비밀번호</label>
      <input id="password" name="password" type="password" required autoComplete="current-password" className="w-full rounded-xl border border-[var(--line)] px-4 py-3 outline-none focus:border-[var(--accent)]" />
      <label className="inline-flex items-center gap-2 text-sm text-[var(--muted)]">
        <input
          type="checkbox"
          checked={rememberUsername}
          onChange={(event) => setRememberUsername(event.target.checked)}
          className="h-4 w-4 rounded border border-[var(--line)]"
        />
        아이디 저장
      </label>
      <button disabled={isLoading} className="w-full rounded-xl bg-[var(--foreground)] px-4 py-3 font-bold text-white disabled:cursor-not-allowed disabled:opacity-60">
        {isLoading ? "로그인 중..." : "로그인"}
      </button>
      {message && <p className="text-sm text-red-600" role="alert">{message}</p>}
    </form>
  );
}
