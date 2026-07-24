"use client";

import { useState } from "react";
import { isAdminUsername } from "@/lib/auth/admin";

type AdminUserItem = {
  id: string;
  username: string;
  displayName: string;
  createdAt: string;
};

export function AdminUsersManager({ initialUsers }: { initialUsers: AdminUserItem[] }) {
  const [users, setUsers] = useState(initialUsers);
  const [messages, setMessages] = useState<Record<string, string>>({});
  const [savingIds, setSavingIds] = useState<string[]>([]);

  function setSaving(id: string, active: boolean) {
    setSavingIds((current) => active ? [...current, id] : current.filter((value) => value !== id));
  }

  async function changePassword(userId: string, username: string, formData: FormData) {
    const password = String(formData.get(`password-${userId}`) ?? "");
    const passwordConfirm = String(formData.get(`passwordConfirm-${userId}`) ?? "");

    if (!password) {
      setMessages((current) => ({ ...current, [userId]: "새 비밀번호를 입력해주세요." }));
      return;
    }
    if (password !== passwordConfirm) {
      setMessages((current) => ({ ...current, [userId]: "비밀번호가 서로 일치하지 않습니다." }));
      return;
    }

    setSaving(userId, true);
    const response = await fetch("/api/admin/password", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ username, password }),
    });
    const payload = await response.json().catch(() => null);
    setSaving(userId, false);

    setMessages((current) => ({ ...current, [userId]: response.ok ? "비밀번호를 변경했습니다." : (payload?.error ?? "비밀번호 변경에 실패했습니다.") }));
  }

  async function deleteUser(userId: string, username: string) {
    if (!window.confirm(`${username} 계정을 정말 삭제할까요? 이 작업은 되돌릴 수 없습니다.`)) return;

    setSaving(userId, true);
    const response = await fetch(`/api/admin/users/${userId}`, { method: "DELETE" });
    const payload = await response.json().catch(() => null);
    setSaving(userId, false);

    if (!response.ok) {
      setMessages((current) => ({ ...current, [userId]: payload?.error ?? "사용자 삭제에 실패했습니다." }));
      return;
    }

    setUsers((current) => current.filter((item) => item.id !== userId));
  }

  return (
    <div className="space-y-4">
      {users.map((user) => {
        const isSaving = savingIds.includes(user.id);
        const isAdmin = isAdminUsername(user.username);

        return (
          <article key={user.id} className="rounded-2xl border border-[var(--line)] p-4 sm:p-5">
            <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <h2 className="text-lg font-bold">{user.username}</h2>
                  {isAdmin && <span className="rounded-full bg-[#f1eee7] px-2 py-0.5 text-[10px] font-bold">admin</span>}
                </div>
                <p className="mt-1 text-sm text-[var(--muted)]">{user.displayName || "표시 이름 없음"}</p>
                <p className="mt-1 text-xs text-[var(--muted)]">가입일 {new Intl.DateTimeFormat("ko-KR", { dateStyle: "medium" }).format(new Date(user.createdAt))}</p>
              </div>

              <form
                className="grid w-full gap-2 sm:grid-cols-[minmax(0,1fr)_minmax(0,1fr)_auto_auto] lg:max-w-2xl"
                onSubmit={(event) => {
                  event.preventDefault();
                  void changePassword(user.id, user.username, new FormData(event.currentTarget));
                }}
              >
                <input
                  name={`password-${user.id}`}
                  type="password"
                  placeholder="새 비밀번호"
                  className="w-full rounded-xl border border-[var(--line)] px-4 py-3 outline-none focus:border-[var(--accent)]"
                />
                <input
                  name={`passwordConfirm-${user.id}`}
                  type="password"
                  placeholder="비밀번호 확인"
                  className="w-full rounded-xl border border-[var(--line)] px-4 py-3 outline-none focus:border-[var(--accent)]"
                />
                <button disabled={isSaving} className="rounded-xl bg-[var(--foreground)] px-4 py-3 text-sm font-bold text-white disabled:opacity-60">
                  변경
                </button>
                <button
                  type="button"
                  disabled={isSaving || isAdmin}
                  onClick={() => void deleteUser(user.id, user.username)}
                  className="rounded-xl border border-[#e2c3bd] bg-[#fff4f1] px-4 py-3 text-sm font-bold text-[var(--accent)] disabled:cursor-not-allowed disabled:opacity-50"
                >
                  탈퇴
                </button>
              </form>
            </div>

            {messages[user.id] && <p className={`mt-3 text-sm ${messages[user.id] === "비밀번호를 변경했습니다." ? "text-green-700" : "text-red-600"}`}>{messages[user.id]}</p>}
          </article>
        );
      })}

      {users.length === 0 && (
        <div className="rounded-2xl bg-[#f7f7f4] p-6 text-center text-sm text-[var(--muted)]">
          표시할 사용자가 없습니다.
        </div>
      )}
    </div>
  );
}
