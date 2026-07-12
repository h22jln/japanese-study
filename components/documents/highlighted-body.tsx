"use client";

import { MouseEvent, useEffect, useRef, useState } from "react";
import { BookOpen, Bookmark, BookmarkCheck, ChevronDown, ChevronUp, Search, X } from "lucide-react";
import { formatPartOfSpeech, formatPartOfSpeechList } from "@/lib/dictionary/format-part-of-speech";

type HighlightWord = {
  surface_form: string | null;
  vocabulary: {
    dictionary_form: string;
    reading: string;
    meaning_ko: string;
    part_of_speech: string | null;
  };
};

type BodyLine = {
  japanese: string;
};

function escapeRegExp(value: string) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function normalizeLine(line: string | BodyLine) {
  return typeof line === "string" ? line.trim() : line.japanese.trim();
}

export function HighlightedBody({ documentId, words, lines }: { documentId: string; words: HighlightWord[]; lines?: Array<string | BodyLine> | null }) {
  const rootRef = useRef<HTMLDivElement | null>(null);
  const lookup = new Map<string, HighlightWord>();
  for (const word of words) {
    if (word.surface_form?.trim()) lookup.set(word.surface_form.trim(), word);
    if (word.vocabulary.dictionary_form.trim()) lookup.set(word.vocabulary.dictionary_form.trim(), word);
  }

  const terms = [...lookup.keys()].sort((a, b) => b.length - a.length);
  const matcher = terms.length > 0 ? new RegExp(`(${terms.map(escapeRegExp).join("|")})`, "g") : null;
  const displayLines = (lines ?? []).map(normalizeLine).filter(Boolean);
  const [openIndexes, setOpenIndexes] = useState<number[]>([]);
  const [translations, setTranslations] = useState<Record<number, string>>({});
  const [loadingIndexes, setLoadingIndexes] = useState<number[]>([]);
  const [selectedText, setSelectedText] = useState("");
  const [selectionButton, setSelectionButton] = useState<{ top: number; left: number } | null>(null);
  const [dictionaryState, setDictionaryState] = useState<{
    loading: boolean;
    error: string;
    localVocabulary: Array<{ id: string; dictionaryForm: string; reading: string; meaningKo: string; partOfSpeech: string | null; isSaved: boolean }>;
    entries: Array<{ id: string; primarySpelling: string | null; primaryReading: string; spellings: string[]; readings: string[]; glosses: string[]; partsOfSpeech: string[]; isCommon: boolean; isSaved?: boolean }>;
  } | null>(null);
  const [savingKey, setSavingKey] = useState<string | null>(null);

  async function toggleLine(index: number) {
    const isOpen = openIndexes.includes(index);
    if (isOpen) {
      setOpenIndexes((current) => current.filter((value) => value !== index));
      return;
    }

    setOpenIndexes((current) => [...current, index]);
    if (translations[index] || loadingIndexes.includes(index)) return;

    const text = displayLines[index];
    if (!text) return;

    setLoadingIndexes((current) => [...current, index]);
    const response = await fetch(`/api/documents/${documentId}/translate-line`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ index, text }),
    });
    const payload = await response.json().catch(() => null);
    setLoadingIndexes((current) => current.filter((value) => value !== index));

    if (!response.ok) {
      setTranslations((current) => ({ ...current, [index]: payload?.error ?? "해석을 불러오지 못했습니다." }));
      return;
    }

    setTranslations((current) => ({ ...current, [index]: payload.translation ?? "" }));
  }

  function clearSelectionLookup() {
    setSelectedText("");
    setSelectionButton(null);
    setDictionaryState(null);
  }

  function captureSelection() {
    const selection = window.getSelection();
    const value = selection?.toString().trim() ?? "";
    if (!selection || !value || value.length > 40 || selection.rangeCount === 0) {
      setSelectionButton(null);
      return;
    }

    const range = selection.getRangeAt(0);
    const root = rootRef.current;
    if (!root) return;

    const anchorNode = selection.anchorNode;
    const focusNode = selection.focusNode;
    if (!anchorNode || !focusNode || !root.contains(anchorNode) || !root.contains(focusNode)) {
      setSelectionButton(null);
      return;
    }

    const rect = range.getBoundingClientRect();
    if (!rect.width && !rect.height) {
      setSelectionButton(null);
      return;
    }

    setSelectedText(value);
    setSelectionButton({
      top: Math.min(rect.bottom + 8, window.innerHeight - 48),
      left: Math.min(rect.left, window.innerWidth - 44),
    });
  }

  async function searchSelectedText(event: MouseEvent<HTMLButtonElement>) {
    event.preventDefault();
    if (!selectedText) return;

    setDictionaryState({ loading: true, error: "", localVocabulary: [], entries: [] });
    const response = await fetch(`/api/dictionary/search?term=${encodeURIComponent(selectedText)}`);
    const payload = await response.json().catch(() => null);

    if (!response.ok) {
      setDictionaryState({ loading: false, error: payload?.error ?? "사전 검색에 실패했습니다.", localVocabulary: [], entries: [] });
      return;
    }

    setDictionaryState({
      loading: false,
      error: "",
      localVocabulary: payload.localVocabulary ?? [],
      entries: payload.entries ?? [],
    });
    setSelectionButton(null);
  }

  async function saveDictionaryItem(payload: { entryId?: string; vocabularyId?: string }, key: string) {
    setSavingKey(key);
    const response = await fetch("/api/dictionary/save", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    const result = await response.json().catch(() => null);
    setSavingKey(null);

    if (!response.ok) {
      setDictionaryState((current) => current ? { ...current, error: result?.error ?? "단어 저장에 실패했습니다." } : current);
      return;
    }

    setDictionaryState((current) => current ? ({
      ...current,
      error: "",
      localVocabulary: current.localVocabulary.map((item) => item.id === payload.vocabularyId ? { ...item, isSaved: true } : item),
      entries: current.entries.map((item) => item.id === payload.entryId ? { ...item, isSaved: true } : item),
    }) : current);
  }

  useEffect(() => {
    function handlePointerUp() {
      window.setTimeout(captureSelection, 10);
    }

    function handlePointerDown(event: PointerEvent) {
      const target = event.target as Node | null;
      if (target && rootRef.current?.contains(target)) return;
      if (selectionButton || dictionaryState) clearSelectionLookup();
    }

    document.addEventListener("mouseup", handlePointerUp);
    document.addEventListener("touchend", handlePointerUp);
    document.addEventListener("pointerdown", handlePointerDown);
    return () => {
      document.removeEventListener("mouseup", handlePointerUp);
      document.removeEventListener("touchend", handlePointerUp);
      document.removeEventListener("pointerdown", handlePointerDown);
    };
  }, [selectionButton, dictionaryState]);

  return (
    <div ref={rootRef} className="relative space-y-5 text-[1.05rem] leading-9 tracking-[.01em] text-[#30312c] sm:text-lg sm:leading-10">
      {displayLines.map((line, lineIndex) => {
        const isOpen = openIndexes.includes(lineIndex);
        const isLoading = loadingIndexes.includes(lineIndex);

        return (
          <article key={`${line}-${lineIndex}`} className="min-w-0">
            <div className="flex items-start gap-3">
              <p className="min-w-0 flex-1 whitespace-pre-wrap break-words">
                {(matcher ? line.split(matcher) : [line]).map((part, index) => {
                  const word = lookup.get(part);
                  if (!word) return <span key={index}>{part}</span>;
                  return (
                    <span key={index} tabIndex={0} className="group relative inline cursor-help rounded bg-[#ffe8a3]/70 px-0.5 outline-none transition hover:bg-[#ffd866] focus:bg-[#ffd866]">
                      {part}
                      <span role="tooltip" className="pointer-events-none absolute bottom-[calc(100%+.45rem)] left-0 z-30 hidden w-56 rounded-xl bg-[#20201d] p-3 text-left text-sm leading-5 tracking-normal text-white shadow-xl group-hover:block group-focus:block">
                        <strong className="block text-base">{word.vocabulary.dictionary_form}</strong>
                        <span className="mt-1 block text-white/65">{word.vocabulary.reading}{formatPartOfSpeech(word.vocabulary.part_of_speech) ? ` · ${formatPartOfSpeech(word.vocabulary.part_of_speech)}` : ""}</span>
                        <span className="mt-2 block">{word.vocabulary.meaning_ko}</span>
                      </span>
                    </span>
                  );
                })}
              </p>
              <button
                type="button"
                onClick={() => toggleLine(lineIndex)}
                aria-label={isOpen ? "해석 숨기기" : "해석 보기"}
                title={isOpen ? "해석 숨기기" : "해석 보기"}
                className="mt-1 inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-full border border-transparent bg-transparent text-[var(--muted)] transition hover:border-[var(--line)] hover:bg-[#f3f3ef] hover:text-[var(--foreground)]"
              >
                {isOpen ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
              </button>
            </div>
            {isOpen && (
              <div className="mt-2 pl-0 pr-12 text-sm leading-6 text-[#8b8d86] sm:pl-0">
                {isLoading ? "해석을 불러오는 중입니다..." : (translations[lineIndex]?.trim() || "해석을 불러오지 못했습니다.")}
              </div>
            )}
          </article>
        );
      })}
      {selectionButton && selectedText && (
        <button
          type="button"
          onClick={searchSelectedText}
          className="fixed z-40 inline-flex h-9 w-9 items-center justify-center rounded-full bg-[var(--foreground)] text-white shadow-lg transition hover:scale-105"
          style={{ top: selectionButton.top, left: selectionButton.left }}
          aria-label="선택한 단어 사전 검색"
          title="사전 검색"
        >
          <Search size={16} />
        </button>
      )}
      {dictionaryState && (
        <aside className="fixed inset-x-4 bottom-4 z-40 mx-auto max-w-md rounded-3xl border border-[var(--line)] bg-white p-4 shadow-2xl sm:left-auto sm:right-6 sm:mx-0 sm:w-[24rem]">
          <div className="flex items-center justify-between gap-3">
            <div className="min-w-0">
              <p className="text-xs font-bold text-[var(--accent)]">사전 검색</p>
              <h3 className="truncate text-lg font-bold">{selectedText}</h3>
            </div>
            <button
              type="button"
              onClick={clearSelectionLookup}
              className="inline-flex h-8 w-8 items-center justify-center rounded-full text-[var(--muted)] transition hover:bg-[#f3f3ef] hover:text-[var(--foreground)]"
              aria-label="사전 검색 닫기"
            >
              <X size={16} />
            </button>
          </div>

          {dictionaryState.loading ? (
            <p className="mt-4 text-sm text-[var(--muted)]">사전을 찾는 중입니다...</p>
          ) : dictionaryState.error ? (
            <p className="mt-4 text-sm text-red-600">{dictionaryState.error}</p>
          ) : (
            <div className="mt-4 space-y-3">
              {dictionaryState.localVocabulary.map((item, index) => (
                <div key={`${item.dictionaryForm}-${index}`} className="rounded-2xl bg-[#f7f7f4] p-3">
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2 text-xs font-bold text-[var(--accent)]"><BookOpen size={14} /> 내 자료 단어</div>
                    <button
                      type="button"
                      disabled={item.isSaved || savingKey === `local-${item.id}`}
                      onClick={() => saveDictionaryItem({ vocabularyId: item.id }, `local-${item.id}`)}
                      className="inline-flex h-8 w-8 items-center justify-center rounded-full border border-[var(--line)] bg-white text-[var(--muted)] transition hover:border-[var(--accent)] hover:text-[var(--accent)] disabled:cursor-not-allowed disabled:opacity-60"
                      aria-label={item.isSaved ? "저장됨" : "단어장 저장"}
                    >
                      {item.isSaved ? <BookmarkCheck size={15} className="text-[var(--accent)]" /> : <Bookmark size={15} />}
                    </button>
                  </div>
                  <p className="mt-2 font-bold">{item.dictionaryForm}</p>
                  <p className="text-sm text-[var(--muted)]">{item.reading}{formatPartOfSpeech(item.partOfSpeech) ? ` · ${formatPartOfSpeech(item.partOfSpeech)}` : ""}</p>
                  <p className="mt-2 text-sm">{item.meaningKo}</p>
                </div>
              ))}
              {dictionaryState.entries.map((entry) => (
                <div key={entry.id} className="rounded-2xl border border-[var(--line)] p-3">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="font-bold">{entry.primarySpelling ?? entry.primaryReading}</p>
                      <span className="text-sm text-[var(--muted)]">{entry.primaryReading}</span>
                      {entry.isCommon && <span className="rounded-full bg-[#f1eee7] px-2 py-0.5 text-[10px] font-bold">common</span>}
                    </div>
                    <button
                      type="button"
                      disabled={entry.isSaved || savingKey === `entry-${entry.id}`}
                      onClick={() => saveDictionaryItem({ entryId: entry.id }, `entry-${entry.id}`)}
                      className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-[var(--line)] bg-white text-[var(--muted)] transition hover:border-[var(--accent)] hover:text-[var(--accent)] disabled:cursor-not-allowed disabled:opacity-60"
                      aria-label={entry.isSaved ? "저장됨" : "단어장 저장"}
                    >
                      {entry.isSaved ? <BookmarkCheck size={15} className="text-[var(--accent)]" /> : <Bookmark size={15} />}
                    </button>
                  </div>
                  {formatPartOfSpeechList(entry.partsOfSpeech).length > 0 && <p className="mt-2 text-xs text-[var(--muted)]">{formatPartOfSpeechList(entry.partsOfSpeech).join(" · ")}</p>}
                  {entry.glosses.length > 0 && <p className="mt-2 text-sm leading-6">{entry.glosses.join("; ")}</p>}
                </div>
              ))}
              {dictionaryState.localVocabulary.length === 0 && dictionaryState.entries.length === 0 && (
                <p className="text-sm text-[var(--muted)]">사전 결과가 없습니다.</p>
              )}
            </div>
          )}
        </aside>
      )}
    </div>
  );
}
