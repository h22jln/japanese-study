"use client";

import { FormEvent, useState } from "react";
import { Pencil, Check, X } from "lucide-react";
import { useRouter } from "next/navigation";

type DocumentTitleFormProps = {
  documentId: string;
  initialTitle: string;
};

export function DocumentTitleForm({ documentId, initialTitle }: DocumentTitleFormProps) {
  const router = useRouter();
  const [isEditing, setIsEditing] = useState(false);
  const [title, setTitle] = useState(initialTitle);
  const [draftTitle, setDraftTitle] = useState(initialTitle);
  const [isSaving, setIsSaving] = useState(false);
  const [message, setMessage] = useState("");

  async function submitTitle(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const nextTitle = draftTitle.trim().slice(0, 200);
    if (!nextTitle) {
      setMessage("제목을 입력해주세요.");
      return;
    }

    setIsSaving(true);
    setMessage("");

    const response = await fetch(`/api/documents/${documentId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ title: nextTitle }),
    });

    setIsSaving(false);

    if (!response.ok) {
      const payload = await response.json().catch(() => ({ error: "제목 변경에 실패했습니다." }));
      setMessage(payload.error ?? "제목 변경에 실패했습니다.");
      return;
    }

    setTitle(nextTitle);
    setDraftTitle(nextTitle);
    setIsEditing(false);
    setMessage("");
    router.refresh();
  }

  function cancelEditing() {
    setDraftTitle(title);
    setIsEditing(false);
    setMessage("");
  }

  if (!isEditing) {
    return (
      <div className="min-w-0">
        <div className="flex flex-wrap items-start gap-3">
          <h1 className="min-w-0 break-words text-2xl font-bold tracking-tight sm:text-3xl md:text-4xl">{title}</h1>
          <button
            type="button"
            onClick={() => setIsEditing(true)}
            className="inline-flex shrink-0 items-center gap-1.5 rounded-full border border-[var(--line)] bg-white px-3 py-1.5 text-xs font-bold text-[var(--muted)] transition hover:border-[var(--accent)] hover:text-[var(--accent)]"
          >
            <Pencil size={14} /> 제목 변경
          </button>
        </div>
        {message && <p className="mt-2 text-sm text-red-600">{message}</p>}
      </div>
    );
  }

  return (
    <form onSubmit={submitTitle} className="min-w-0">
      <div className="flex flex-col gap-3 sm:max-w-xl">
        <input
          value={draftTitle}
          onChange={(event) => setDraftTitle(event.target.value)}
          maxLength={200}
          autoFocus
          className="w-full rounded-2xl border border-[var(--line)] bg-white px-4 py-3 text-lg font-bold outline-none ring-0 placeholder:text-[#a0a199] focus:border-[var(--accent)] sm:text-2xl"
          placeholder="자료 제목"
        />
        <div className="flex flex-wrap items-center gap-2">
          <button
            type="submit"
            disabled={isSaving}
            className="inline-flex items-center gap-1.5 rounded-full bg-[var(--accent)] px-4 py-2 text-sm font-bold text-white transition hover:bg-[var(--accent-dark)] disabled:cursor-wait disabled:opacity-60"
          >
            <Check size={15} /> {isSaving ? "저장 중..." : "저장"}
          </button>
          <button
            type="button"
            onClick={cancelEditing}
            disabled={isSaving}
            className="inline-flex items-center gap-1.5 rounded-full border border-[var(--line)] bg-white px-4 py-2 text-sm font-bold text-[var(--muted)] transition hover:border-[var(--foreground)] hover:text-[var(--foreground)] disabled:opacity-60"
          >
            <X size={15} /> 취소
          </button>
        </div>
        {message && <p className="text-sm text-red-600">{message}</p>}
      </div>
    </form>
  );
}
