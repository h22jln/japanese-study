"use client";

import { useState } from "react";
import { Pin, PinOff } from "lucide-react";
import { useRouter } from "next/navigation";

type PinDocumentButtonProps = {
  documentId: string;
  initialPinned: boolean;
  compact?: boolean;
};

export function PinDocumentButton({ documentId, initialPinned, compact = false }: PinDocumentButtonProps) {
  const router = useRouter();
  const [pinned, setPinned] = useState(initialPinned);
  const [loading, setLoading] = useState(false);

  async function togglePinned() {
    if (loading) return;
    setLoading(true);

    const response = await fetch(`/api/documents/${documentId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ pinned: !pinned }),
    });

    setLoading(false);
    if (!response.ok) return;

    setPinned(!pinned);
    router.refresh();
  }

  return (
    <button
      type="button"
      onClick={togglePinned}
      disabled={loading}
      aria-pressed={pinned}
      aria-label={pinned ? "핀 해제" : "핀 고정"}
      title={pinned ? "핀 해제" : "핀 고정"}
      className={[
        "inline-flex items-center justify-center rounded-full border transition disabled:cursor-not-allowed disabled:opacity-60",
        pinned ? "border-[var(--accent)] bg-[var(--accent)] text-white" : "border-[var(--line)] bg-white text-[var(--muted)] hover:border-[var(--accent)] hover:text-[var(--accent)]",
        compact ? "h-8 w-8" : "h-9 w-9",
      ].join(" ")}
    >
      {pinned ? <PinOff size={compact ? 14 : 16} /> : <Pin size={compact ? 14 : 16} />}
    </button>
  );
}
