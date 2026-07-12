"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { isValidUsername, normalizeUsername, usernameToAuthEmail } from "@/lib/auth/username";

export function SignupForm() {
  const [message, setMessage] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const router = useRouter();

  async function signUp(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setMessage("");

    const form = new FormData(event.currentTarget);
    const username = normalizeUsername(String(form.get("username")));
    const password = String(form.get("password"));
    const passwordConfirm = String(form.get("passwordConfirm"));

    if (!isValidUsername(username)) return setMessage("아이디는 영문 소문자, 숫자, 밑줄을 사용해 4~20자로 입력해주세요.");
    if (password.length < 8) return setMessage("비밀번호는 8자 이상이어야 합니다.");
    if (password !== passwordConfirm) return setMessage("비밀번호가 서로 일치하지 않습니다.");

    const supabase = createClient();
    if (!supabase) return setMessage("먼저 .env.local에 Supabase 키를 설정해주세요.");

    setIsLoading(true);
    const { data, error } = await supabase.auth.signUp({
      email: usernameToAuthEmail(username),
      password,
      options: {
        data: { username, display_name: username },
      },
    });
    setIsLoading(false);

    if (error) {
      if (error.message.toLowerCase().includes("already") || error.message.toLowerCase().includes("duplicate")) {
        return setMessage("이미 사용 중인 아이디입니다.");
      }
      return setMessage("회원가입 중 오류가 발생했습니다. 잠시 후 다시 시도해주세요.");
    }

    if (data.session) {
      router.replace("/dashboard");
      router.refresh();
      return;
    }

    setMessage("가입 설정을 확인해주세요. 이메일 확인 기능이 꺼져 있어야 합니다.");
  }

  return (
    <form onSubmit={signUp} className="mt-8 space-y-4">
      <label className="block text-sm font-semibold" htmlFor="username">아이디</label>
      <input id="username" name="username" required minLength={4} maxLength={20} autoCapitalize="none" autoComplete="username" spellCheck={false} placeholder="영문 소문자, 숫자, 밑줄 4~20자" className="w-full rounded-xl border border-[var(--line)] px-4 py-3 outline-none focus:border-[var(--accent)]" />

      <label className="block text-sm font-semibold" htmlFor="password">비밀번호</label>
      <input id="password" name="password" type="password" required minLength={8} autoComplete="new-password" placeholder="8자 이상" className="w-full rounded-xl border border-[var(--line)] px-4 py-3 outline-none focus:border-[var(--accent)]" />

      <label className="block text-sm font-semibold" htmlFor="passwordConfirm">비밀번호 확인</label>
      <input id="passwordConfirm" name="passwordConfirm" type="password" required minLength={8} autoComplete="new-password" className="w-full rounded-xl border border-[var(--line)] px-4 py-3 outline-none focus:border-[var(--accent)]" />

      <button disabled={isLoading} className="w-full rounded-xl bg-[var(--accent)] px-4 py-3 font-bold text-white hover:bg-[var(--accent-dark)] disabled:cursor-not-allowed disabled:opacity-60">
        {isLoading ? "계정 만드는 중..." : "회원가입"}
      </button>
      {message && <p className="text-sm text-red-600" role="alert">{message}</p>}
      <p className="text-xs leading-5 text-[var(--muted)]">가입하면 서비스 이용약관과 개인정보 처리방침에 동의한 것으로 간주됩니다.</p>
    </form>
  );
}
