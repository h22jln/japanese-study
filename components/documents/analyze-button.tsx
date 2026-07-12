"use client";

import { useState } from "react";
import { Sparkles } from "lucide-react";
import { useRouter } from "next/navigation";

export function AnalyzeButton({ documentId }: { documentId: string }) {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");
  const router = useRouter();

  async function analyze() {
    setIsLoading(true);
    setError("");
    const response = await fetch(`/api/documents/${documentId}/analyze`, { method: "POST" });
    setIsLoading(false);
    if (!response.ok) {
      const body = await response.json().catch(() => null);
      const message = body?.error === "OpenAI is not configured"
        ? "OpenAI API 키가 필요합니다."
        : typeof body?.error === "string"
          ? body.error
          : `분석 요청에 실패했습니다. (${response.status})`;
      console.error("Document analysis failed", { status: response.status, message });
      return setError(message.slice(0, 200));
    }
    router.refresh();
  }

  return (
    <div className="text-right">
      <button onClick={analyze} disabled={isLoading} className="inline-flex min-h-9 items-center justify-center gap-1.5 rounded-full border border-[var(--line)] px-3 py-2 text-xs font-bold hover:bg-[#f7f7f4] disabled:opacity-60">
        <Sparkles size={13} /> {isLoading ? "요청 중" : "AI 분석"}
      </button>
      {error && <p className="mt-1 max-w-[18rem] break-words text-[11px] text-red-600">{error}</p>}
    </div>
  );
}
