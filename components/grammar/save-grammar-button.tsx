"use client";

import { useState } from "react";
import { Bookmark, BookmarkCheck } from "lucide-react";
import { createClient } from "@/lib/supabase/client";

type SaveGrammarButtonProps = {
  grammarPointId: string;
  userId: string;
  initialSaved: boolean;
  compact?: boolean;
};

export function SaveGrammarButton({ grammarPointId, userId, initialSaved, compact = false }: SaveGrammarButtonProps) {
  const [saved, setSaved] = useState(initialSaved);
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");

  async function toggleSaved() {
    const supabase = createClient();
    if (!supabase || loading) return;

    setLoading(true);
    setErrorMessage("");

    const result = saved
      ? await supabase.from("saved_grammar_points").delete().eq("user_id", userId).eq("grammar_point_id", grammarPointId)
      : await supabase.from("saved_grammar_points").insert({ user_id: userId, grammar_point_id: grammarPointId });

    setLoading(false);

    if (result.error) {
      setErrorMessage(saved ? "저장 해제 실패" : "저장 실패");
      return;
    }

    setSaved(!saved);
  }

  return (
    <div className="shrink-0">
      <button
        type="button"
        onClick={toggleSaved}
        disabled={loading}
        aria-pressed={saved}
        aria-label={saved ? "문법 저장 해제" : "문법 저장"}
        className={[
          "inline-flex items-center justify-center gap-1.5 rounded-full border font-bold transition disabled:cursor-not-allowed disabled:opacity-60",
          saved ? "border-[var(--accent)] bg-[var(--accent)] text-white" : "border-[var(--line)] bg-white text-[var(--muted)] hover:border-[var(--accent)] hover:text-[var(--accent)]",
          compact ? "h-8 w-8" : saved ? "h-9 w-9 text-xs" : "px-3 py-1.5 text-xs",
        ].join(" ")}
      >
        {saved ? <BookmarkCheck size={compact ? 15 : 14} /> : <Bookmark size={compact ? 15 : 14} />}
        {!compact && !saved && "저장"}
      </button>
      {errorMessage && <p className="mt-1 text-[10px] font-semibold text-[var(--accent-dark)]">{errorMessage}</p>}
    </div>
  );
}
