"use client";

import { useState } from "react";
import { Trash2 } from "lucide-react";
import { useRouter } from "next/navigation";

type DeleteDocumentButtonProps = {
  documentId: string;
  redirectTo?: string;
  compact?: boolean;
};

export function DeleteDocumentButton({ documentId, redirectTo, compact = false }: DeleteDocumentButtonProps) {
  const router = useRouter();
  const [isDeleting, setIsDeleting] = useState(false);
  const [error, setError] = useState("");

  async function deleteDocument() {
    if (isDeleting) return;
    const confirmed = window.confirm("이 자료를 삭제할까요? PDF와 분석 결과가 함께 삭제됩니다.");
    if (!confirmed) return;

    setIsDeleting(true);
    setError("");

    const response = await fetch(`/api/documents/${documentId}`, { method: "DELETE" });
    setIsDeleting(false);

    if (!response.ok) {
      const body = await response.json().catch(() => null);
      return setError(typeof body?.error === "string" ? body.error : "자료 삭제에 실패했습니다.");
    }

    if (redirectTo) {
      router.push(redirectTo);
    } else {
      router.refresh();
    }
  }

  return (
    <div className={compact ? "" : "text-right"}>
      <button
        type="button"
        onClick={deleteDocument}
        disabled={isDeleting}
        aria-label="자료 삭제"
        title="자료 삭제"
        className={[
          "inline-flex items-center justify-center rounded-full border border-red-200 text-red-600 transition hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-60",
          compact ? "h-8 w-8" : "h-9 gap-1.5 px-3 text-xs font-bold",
        ].join(" ")}
      >
        <Trash2 size={compact ? 14 : 15} />
        {!compact && <span>{isDeleting ? "삭제 중" : "삭제"}</span>}
      </button>
      {error && <p className="mt-1 max-w-[18rem] break-words text-[11px] text-red-600">{error}</p>}
    </div>
  );
}
