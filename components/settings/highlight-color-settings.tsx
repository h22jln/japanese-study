"use client";

import { Check } from "lucide-react";
import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import {
  defaultAnalysisHighlightColor,
  defaultLookupHighlightColor,
  highlightColorOptions,
  type HighlightColorKey,
} from "@/lib/user-highlight-colors";

type HighlightColorSettingsProps = {
  userId: string;
  initialAnalysisColor?: string | null;
  initialLookupColor?: string | null;
};

function isHighlightColorKey(value: string | null | undefined): value is HighlightColorKey {
  return highlightColorOptions.some((option) => option.key === value);
}

export function HighlightColorSettings({
  userId,
  initialAnalysisColor,
  initialLookupColor,
}: HighlightColorSettingsProps) {
  const [analysisColor, setAnalysisColor] = useState<HighlightColorKey>(
    isHighlightColorKey(initialAnalysisColor) ? initialAnalysisColor : defaultAnalysisHighlightColor,
  );
  const [lookupColor, setLookupColor] = useState<HighlightColorKey>(
    isHighlightColorKey(initialLookupColor) ? initialLookupColor : defaultLookupHighlightColor,
  );
  const [status, setStatus] = useState("");
  const [isSaving, setIsSaving] = useState(false);

  async function saveSettings() {
    const supabase = createClient();
    if (!supabase || isSaving) return;

    setIsSaving(true);
    setStatus("");
    const { error } = await supabase
      .from("profiles")
      .update({
        analysis_highlight_color: analysisColor,
        lookup_highlight_color: lookupColor,
        updated_at: new Date().toISOString(),
      })
      .eq("id", userId);

    setIsSaving(false);
    setStatus(error ? "설정 저장에 실패했습니다. DB 마이그레이션 적용 여부를 확인해주세요." : "저장했습니다.");
  }

  function renderPicker({
    title,
    description,
    value,
    onChange,
  }: {
    title: string;
    description: string;
    value: HighlightColorKey;
    onChange: (value: HighlightColorKey) => void;
  }) {
    return (
      <section className="rounded-3xl border border-[var(--line)] bg-white p-5 sm:p-6">
        <h2 className="text-lg font-bold">{title}</h2>
        <p className="mt-1 text-sm leading-6 text-[var(--muted)]">{description}</p>
        <div className="mt-5 grid grid-cols-2 gap-2 sm:grid-cols-4">
          {highlightColorOptions.map((option) => {
            const selected = option.key === value;

            return (
              <button
                key={option.key}
                type="button"
                onClick={() => onChange(option.key)}
                className={`flex min-h-14 items-center gap-2 rounded-2xl border px-3 text-left text-sm font-bold transition ${
                  selected ? "border-[var(--accent)] bg-[#fff7f3] text-[var(--foreground)]" : "border-[var(--line)] bg-white text-[var(--muted)] hover:border-[var(--accent)]"
                }`}
              >
                <span className={`grid h-7 w-7 shrink-0 place-items-center rounded-full ring-1 ring-black/5 ${option.swatchClassName}`}>
                  {selected && <Check size={15} />}
                </span>
                <span className="min-w-0 truncate">{option.label}</span>
              </button>
            );
          })}
        </div>
      </section>
    );
  }

  return (
    <div className="mt-8 space-y-4 sm:mt-10">
      {renderPicker({
        title: "AI 분석 단어 표시",
        description: "자료 분석으로 자동 표시된 단어 색입니다.",
        value: analysisColor,
        onChange: setAnalysisColor,
      })}
      {renderPicker({
        title: "저장/검색 단어 표시",
        description: "드래그 검색 후 자료에 저장한 단어 색입니다.",
        value: lookupColor,
        onChange: setLookupColor,
      })}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-end">
        {status && <p className="text-sm font-semibold text-[var(--muted)]">{status}</p>}
        <button
          type="button"
          onClick={saveSettings}
          disabled={isSaving}
          className="inline-flex min-h-11 items-center justify-center rounded-full bg-[var(--accent)] px-5 text-sm font-bold text-white transition hover:bg-[var(--accent-dark)] disabled:cursor-not-allowed disabled:opacity-60"
        >
          {isSaving ? "저장 중" : "설정 저장"}
        </button>
      </div>
    </div>
  );
}
