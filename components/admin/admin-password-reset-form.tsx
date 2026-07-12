"use client";

import { FormEvent, useState } from "react";

export function AdminPasswordResetForm() {
  const [message, setMessage] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setMessage("");
    setIsSuccess(false);

    const form = new FormData(event.currentTarget);
    const username = String(form.get("username") ?? "").trim().toLowerCase();
    const password = String(form.get("password") ?? "");
    const passwordConfirm = String(form.get("passwordConfirm") ?? "");

    if (!/^[a-z0-9_]{4,20}$/.test(username)) {
      setMessage("아이디 형식을 확인해주세요.");
      return;
    }
    if (password.length < 8) {
      setMessage("비밀번호는 8자 이상이어야 합니다.");
      return;
    }
    if (password !== passwordConfirm) {
      setMessage("비밀번호가 서로 일치하지 않습니다.");
      return;
    }

    setIsLoading(true);
    const response = await fetch("/api/admin/password", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ username, password }),
    });
    const payload = await response.json().catch(() => null);
    setIsLoading(false);

    if (!response.ok) {
      setMessage(payload?.error ?? "비밀번호 변경에 실패했습니다.");
      return;
    }

    setIsSuccess(true);
    setMessage("비밀번호를 변경했습니다.");
    event.currentTarget.reset();
  }

  return (
    <form onSubmit={onSubmit} className="mt-8 space-y-4">
      <label className="block text-sm font-semibold" htmlFor="username">대상 아이디</label>
      <input id="username" name="username" required minLength={4} maxLength={20} autoCapitalize="none" autoComplete="username" spellCheck={false} placeholder="matane_user" className="w-full rounded-xl border border-[var(--line)] px-4 py-3 outline-none focus:border-[var(--accent)]" />

      <label className="block text-sm font-semibold" htmlFor="password">새 비밀번호</label>
      <input id="password" name="password" type="password" required minLength={8} autoComplete="new-password" placeholder="8자 이상" className="w-full rounded-xl border border-[var(--line)] px-4 py-3 outline-none focus:border-[var(--accent)]" />

      <label className="block text-sm font-semibold" htmlFor="passwordConfirm">새 비밀번호 확인</label>
      <input id="passwordConfirm" name="passwordConfirm" type="password" required minLength={8} autoComplete="new-password" className="w-full rounded-xl border border-[var(--line)] px-4 py-3 outline-none focus:border-[var(--accent)]" />

      <button disabled={isLoading} className="w-full rounded-xl bg-[var(--foreground)] px-4 py-3 font-bold text-white disabled:cursor-not-allowed disabled:opacity-60">
        {isLoading ? "변경 중..." : "비밀번호 변경"}
      </button>

      {message && (
        <p className={`text-sm ${isSuccess ? "text-green-700" : "text-red-600"}`} role="alert">
          {message}
        </p>
      )}
    </form>
  );
}
