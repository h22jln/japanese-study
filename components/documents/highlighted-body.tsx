"use client";

import { MouseEvent, useEffect, useRef, useState } from "react";
import type { ReactNode } from "react";
import { BookOpen, Bookmark, BookmarkCheck, ChevronDown, ChevronUp, Languages, Search, Sparkles, StickyNote, Trash2, X } from "lucide-react";
import { useRouter } from "next/navigation";
import { formatPartOfSpeech, formatPartOfSpeechList } from "@/lib/dictionary/format-part-of-speech";

type HighlightWord = {
  surface_form: string | null;
  source?: "analysis" | "user_lookup" | null;
  vocabulary: {
    id: string;
    dictionary_form: string;
    reading: string;
    meaning_ko: string;
    part_of_speech: string | null;
  };
};

type BodyLine = {
  japanese: string;
};

type DocumentNote = {
  id: string;
  line_index: number;
  selected_text: string;
  note_text: string;
  start_offset: number | null;
  end_offset: number | null;
  created_at: string;
  updated_at: string;
};

function escapeRegExp(value: string) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function normalizeLine(line: string | BodyLine) {
  return typeof line === "string" ? line.trim() : line.japanese.trim();
}

export function HighlightedBody({
  documentId,
  words,
  lines,
  initialTranslations,
  initialSummary,
  initialNotes,
}: {
  documentId: string;
  words: HighlightWord[];
  lines?: Array<string | BodyLine> | null;
  initialTranslations?: Record<string, string> | null;
  initialSummary?: string | null;
  initialNotes?: DocumentNote[];
}) {
  const rootRef = useRef<HTMLDivElement | null>(null);
  const router = useRouter();
  const lookup = new Map<string, HighlightWord>();
  for (const word of words) {
    if (word.surface_form?.trim()) lookup.set(word.surface_form.trim(), word);
    if (word.vocabulary.dictionary_form.trim()) lookup.set(word.vocabulary.dictionary_form.trim(), word);
  }

  const terms = [...lookup.keys()].sort((a, b) => b.length - a.length);
  const matcher = terms.length > 0 ? new RegExp(`(${terms.map(escapeRegExp).join("|")})`, "g") : null;
  const displayLines = (lines ?? []).map(normalizeLine).filter(Boolean);
  const normalizedInitialTranslations = Object.entries(initialTranslations ?? {}).reduce<Record<number, string>>((acc, [key, value]) => {
    const index = Number(key);
    const translation = typeof value === "string" ? value.trim() : "";
    if (Number.isInteger(index) && index >= 0 && translation) acc[index] = translation;
    return acc;
  }, {});
  const [openIndexes, setOpenIndexes] = useState<number[]>(Object.keys(normalizedInitialTranslations).map(Number));
  const [translations, setTranslations] = useState<Record<number, string>>(normalizedInitialTranslations);
  const [loadingIndexes, setLoadingIndexes] = useState<number[]>([]);
  const [isTranslatingAll, setIsTranslatingAll] = useState(false);
  const [isSummarizing, setIsSummarizing] = useState(false);
  const [toolError, setToolError] = useState("");
  const [summary, setSummary] = useState(initialSummary?.trim() ?? "");
  const [summaryOpen, setSummaryOpen] = useState(Boolean(initialSummary?.trim()));
  const [selectedText, setSelectedText] = useState("");
  const [selectedLineIndex, setSelectedLineIndex] = useState<number | null>(null);
  const [selectedStartOffset, setSelectedStartOffset] = useState<number | null>(null);
  const [selectedEndOffset, setSelectedEndOffset] = useState<number | null>(null);
  const [selectionButton, setSelectionButton] = useState<{ top: number; left: number } | null>(null);
  const [notes, setNotes] = useState<DocumentNote[]>(initialNotes ?? []);
  const [noteDraft, setNoteDraft] = useState("");
  const [noteComposerOpen, setNoteComposerOpen] = useState(false);
  const [noteError, setNoteError] = useState("");
  const [savingNote, setSavingNote] = useState(false);
  const [deletingNoteId, setDeletingNoteId] = useState<string | null>(null);
  const [dictionaryState, setDictionaryState] = useState<{
    loading: boolean;
    error: string;
    localVocabulary: Array<{ id: string; dictionaryForm: string; reading: string; meaningKo: string; partOfSpeech: string | null; isSaved: boolean }>;
    entries: Array<{ id: string; primarySpelling: string | null; primaryReading: string; spellings: string[]; readings: string[]; glosses: string[]; partsOfSpeech: string[]; isCommon: boolean; isSaved?: boolean; source?: "db" | "ai" }>;
  } | null>(null);
  const [savingKey, setSavingKey] = useState<string | null>(null);

  function focusVocabularyCard(vocabularyId: string) {
    const card = document.getElementById(`vocab-card-${vocabularyId}`);
    if (!card) return;

    card.scrollIntoView({
      behavior: "smooth",
      block: "center",
      inline: "nearest",
    });

    card.classList.remove("vocab-card-flash");
    window.setTimeout(() => {
      card.classList.add("vocab-card-flash");
    }, 30);
    window.setTimeout(() => {
      card.classList.remove("vocab-card-flash");
    }, 1800);
  }

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

  async function translateAll() {
    if (isTranslatingAll) return;

    setIsTranslatingAll(true);
    setToolError("");
    const response = await fetch(`/api/documents/${documentId}/translate-all`, { method: "POST" });
    const payload = await response.json().catch(() => null);
    setIsTranslatingAll(false);

    if (!response.ok) {
      setToolError(payload?.error ?? "전체 해석을 불러오지 못했습니다.");
      return;
    }

    const nextTranslations = Object.entries(payload?.translations ?? {}).reduce<Record<number, string>>((acc, [key, value]) => {
      const index = Number(key);
      if (Number.isInteger(index) && typeof value === "string" && value.trim()) acc[index] = value;
      return acc;
    }, {});
    setTranslations(nextTranslations);
    setOpenIndexes(displayLines.map((_, index) => index));
  }

  async function summarizeDocument() {
    if (isSummarizing) return;
    if (summary) {
      setSummaryOpen((current) => !current);
      return;
    }

    setIsSummarizing(true);
    setToolError("");
    const response = await fetch(`/api/documents/${documentId}/summary`, { method: "POST" });
    const payload = await response.json().catch(() => null);
    setIsSummarizing(false);

    if (!response.ok) {
      setToolError(payload?.error ?? "요약을 불러오지 못했습니다.");
      return;
    }

    setSummary(payload?.summary ?? "");
    setSummaryOpen(true);
  }

  function clearSelectionLookup() {
    setSelectedText("");
    setSelectedLineIndex(null);
    setSelectedStartOffset(null);
    setSelectedEndOffset(null);
    setSelectionButton(null);
    setDictionaryState(null);
    setNoteComposerOpen(false);
    setNoteDraft("");
    setNoteError("");
  }

  function captureSelection() {
    const selection = window.getSelection();
    const value = selection?.toString().trim() ?? "";
    if (!selection || !value || value.length > 200 || selection.rangeCount === 0) {
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

    const element = anchorNode.nodeType === Node.ELEMENT_NODE ? anchorNode as Element : anchorNode.parentElement;
    const lineElement = element?.closest<HTMLElement>("[data-line-index]");
    const lineIndex = Number(lineElement?.dataset.lineIndex);
    const lineText = Number.isInteger(lineIndex) ? displayLines[lineIndex] : "";
    const startOffset = lineText ? lineText.indexOf(value) : -1;

    setSelectedText(value);
    setSelectedLineIndex(Number.isInteger(lineIndex) ? lineIndex : null);
    setSelectedStartOffset(startOffset >= 0 ? startOffset : null);
    setSelectedEndOffset(startOffset >= 0 ? startOffset + value.length : null);
    setSelectionButton({
      top: Math.min(rect.bottom + 8, window.innerHeight - 48),
      left: Math.min(rect.left, window.innerWidth - 44),
    });
  }

  function openNoteComposer(event: MouseEvent<HTMLButtonElement>) {
    event.preventDefault();
    if (!selectedText || selectedLineIndex === null) return;
    setDictionaryState(null);
    setNoteComposerOpen(true);
    setSelectionButton(null);
    setNoteError("");
  }

  async function saveNote() {
    if (!selectedText || selectedLineIndex === null || savingNote) return;
    const noteText = noteDraft.trim();
    if (!noteText) {
      setNoteError("메모 내용을 입력해주세요.");
      return;
    }

    setSavingNote(true);
    setNoteError("");
    const response = await fetch(`/api/documents/${documentId}/notes`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        lineIndex: selectedLineIndex,
        selectedText,
        noteText,
        startOffset: selectedStartOffset,
        endOffset: selectedEndOffset,
      }),
    });
    const payload = await response.json().catch(() => null);
    setSavingNote(false);

    if (!response.ok) {
      setNoteError(payload?.error ?? "메모 저장에 실패했습니다.");
      return;
    }

    setNotes((current) => [...current, payload.note]);
    clearSelectionLookup();
  }

  async function deleteNote(noteId: string) {
    if (deletingNoteId) return;
    setDeletingNoteId(noteId);
    const response = await fetch(`/api/documents/${documentId}/notes`, {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ noteId }),
    });
    setDeletingNoteId(null);
    if (!response.ok) return;
    setNotes((current) => current.filter((note) => note.id !== noteId));
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

  async function saveDictionaryItem(payload: {
    entryId?: string;
    vocabularyId?: string;
    aiEntry?: { dictionaryForm: string; reading: string; meaningKo: string; partOfSpeech?: string | null };
  }, key: string) {
    setSavingKey(key);
    const response = await fetch("/api/dictionary/save", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        ...payload,
        documentId,
        surfaceForm: selectedText,
      }),
    });
    const result = await response.json().catch(() => null);
    setSavingKey(null);

    if (!response.ok) {
      setDictionaryState((current) => current ? { ...current, error: result?.error ?? "단어 저장에 실패했습니다." } : current);
      return;
    }

    router.refresh();

    setDictionaryState((current) => current ? ({
      ...current,
      error: "",
      localVocabulary: current.localVocabulary.map((item) => item.id === payload.vocabularyId ? { ...item, isSaved: true } : item),
      entries: current.entries.map((item) => {
        if (payload.entryId && item.id === payload.entryId) return { ...item, isSaved: true };
        if (
          payload.aiEntry &&
          item.source === "ai" &&
          (item.primarySpelling ?? item.primaryReading) === payload.aiEntry.dictionaryForm &&
          item.primaryReading === payload.aiEntry.reading
        ) {
          return { ...item, isSaved: true };
        }
        return item;
      }),
    }) : current);
  }

  function renderTextWithVocabulary(text: string, keyPrefix: string) {
    return (matcher ? text.split(matcher) : [text]).map((part, index) => {
      const word = lookup.get(part);
      if (!word) return <span key={`${keyPrefix}-text-${index}`}>{part}</span>;
      const highlightClass = word.source === "user_lookup"
        ? "bg-[#c9f4e5]/80 hover:bg-[#9ce8cc] focus:bg-[#9ce8cc]"
        : "bg-[#ffe8a3]/70 hover:bg-[#ffd866] focus:bg-[#ffd866]";

      return (
        <span
          key={`${keyPrefix}-word-${index}`}
          tabIndex={0}
          role="button"
          onClick={() => focusVocabularyCard(word.vocabulary.id)}
          onKeyDown={(event) => {
            if (event.key === "Enter" || event.key === " ") {
              event.preventDefault();
              focusVocabularyCard(word.vocabulary.id);
            }
          }}
          className={`group relative inline cursor-pointer rounded px-0.5 outline-none transition ${highlightClass}`}
        >
          {part}
          <span role="tooltip" className="pointer-events-none absolute bottom-[calc(100%+.45rem)] left-0 z-30 hidden w-56 rounded-xl bg-[#20201d] p-3 text-left text-sm leading-5 tracking-normal text-white shadow-xl group-hover:block group-focus:block">
            <strong className="block text-base">{word.vocabulary.dictionary_form}</strong>
            <span className="mt-1 block text-white/65">{word.vocabulary.reading}{formatPartOfSpeech(word.vocabulary.part_of_speech) ? ` · ${formatPartOfSpeech(word.vocabulary.part_of_speech)}` : ""}</span>
            <span className="mt-2 block">{word.vocabulary.meaning_ko}</span>
          </span>
        </span>
      );
    });
  }

  function renderLineText(line: string, lineIndex: number) {
    const lineNotes = notes
      .filter((note) => note.line_index === lineIndex)
      .map((note) => {
        const start = typeof note.start_offset === "number" && note.start_offset >= 0
          ? note.start_offset
          : line.indexOf(note.selected_text);
        const end = typeof note.end_offset === "number" && note.end_offset > start
          ? note.end_offset
          : start + note.selected_text.length;
        return { ...note, start, end };
      })
      .filter((note) => note.start >= 0 && note.end > note.start)
      .sort((a, b) => a.start - b.start);

    const parts: ReactNode[] = [];
    let cursor = 0;

    for (const note of lineNotes) {
      if (note.start < cursor) continue;
      if (note.start > cursor) {
        parts.push(...renderTextWithVocabulary(line.slice(cursor, note.start), `line-${lineIndex}-${cursor}`));
      }

      parts.push(
        <span key={`note-${note.id}`} className="group/note relative rounded bg-[#d9f6ee] px-0.5 ring-1 ring-[#a9e5d3]">
          {line.slice(note.start, note.end)}
          <span role="tooltip" className="pointer-events-none absolute bottom-[calc(100%+.45rem)] left-0 z-30 hidden w-64 rounded-xl bg-[#20201d] p-3 text-left text-sm leading-5 tracking-normal text-white shadow-xl group-hover/note:block">
            <strong className="block text-xs text-white/55">메모</strong>
            <span className="mt-1 block whitespace-pre-wrap">{note.note_text}</span>
          </span>
        </span>,
      );
      cursor = note.end;
    }

    if (cursor < line.length) {
      parts.push(...renderTextWithVocabulary(line.slice(cursor), `line-${lineIndex}-${cursor}`));
    }

    return parts;
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
    // The document listeners should be rebound only when popover visibility changes.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectionButton, dictionaryState]);

  return (
    <div ref={rootRef} className="relative space-y-5 text-[1.05rem] leading-9 tracking-[.01em] text-[#30312c] sm:text-lg sm:leading-10">
      <div className="flex flex-col gap-3 rounded-2xl bg-[#f7f7f4] p-3 text-sm leading-6 tracking-normal sm:flex-row sm:items-center sm:justify-between">
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={translateAll}
            disabled={isTranslatingAll}
            className="inline-flex min-h-9 items-center justify-center gap-1.5 rounded-full border border-[var(--line)] bg-white px-3 text-xs font-bold transition hover:border-[var(--accent)] hover:text-[var(--accent)] disabled:cursor-not-allowed disabled:opacity-60"
          >
            <Languages size={14} /> {isTranslatingAll ? "해석 중" : "전체 해석"}
          </button>
          <button
            type="button"
            onClick={summarizeDocument}
            disabled={isSummarizing}
            className="inline-flex min-h-9 items-center justify-center gap-1.5 rounded-full border border-[var(--line)] bg-white px-3 text-xs font-bold transition hover:border-[var(--accent)] hover:text-[var(--accent)] disabled:cursor-not-allowed disabled:opacity-60"
          >
            <Sparkles size={14} /> {isSummarizing ? "요약 중" : summaryOpen ? "요약 닫기" : "내용 요약"}
          </button>
        </div>
        {toolError && <p className="break-words text-xs text-red-600">{toolError}</p>}
      </div>
      {summaryOpen && summary && (
        <div className="whitespace-pre-wrap rounded-2xl border border-[var(--line)] bg-white p-4 text-sm leading-7 tracking-normal text-[var(--muted)]">
          {summary}
        </div>
      )}
      {displayLines.map((line, lineIndex) => {
        const isOpen = openIndexes.includes(lineIndex);
        const isLoading = loadingIndexes.includes(lineIndex);

        return (
          <article key={`${line}-${lineIndex}`} data-line-index={lineIndex} className="min-w-0">
            <div className="flex items-start gap-3">
              <p className="min-w-0 flex-1 whitespace-pre-wrap break-words">
                {renderLineText(line, lineIndex)}
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
        <div
          className="fixed z-40 inline-flex overflow-hidden rounded-full bg-[var(--foreground)] text-white shadow-lg"
          style={{ top: selectionButton.top, left: selectionButton.left }}
        >
          <button
            type="button"
            onClick={searchSelectedText}
            className="inline-flex h-9 w-9 items-center justify-center transition hover:bg-white/15"
            aria-label="선택한 단어 사전 검색"
            title="사전 검색"
          >
            <Search size={16} />
          </button>
          <button
            type="button"
            onClick={openNoteComposer}
            className="inline-flex h-9 w-9 items-center justify-center border-l border-white/15 transition hover:bg-white/15"
            aria-label="선택한 부분에 메모"
            title="메모"
          >
            <StickyNote size={16} />
          </button>
        </div>
      )}
      {noteComposerOpen && (
        <aside className="fixed inset-x-4 bottom-4 z-40 mx-auto max-w-md rounded-3xl border border-[var(--line)] bg-white p-4 text-sm leading-6 tracking-normal shadow-2xl sm:left-auto sm:right-6 sm:mx-0 sm:w-[24rem]">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <p className="text-xs font-bold text-[var(--accent)]">선택 메모</p>
              <p className="mt-1 line-clamp-2 break-words font-bold">{selectedText}</p>
            </div>
            <button
              type="button"
              onClick={clearSelectionLookup}
              className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-[var(--muted)] transition hover:bg-[#f3f3ef] hover:text-[var(--foreground)]"
              aria-label="메모 닫기"
            >
              <X size={16} />
            </button>
          </div>
          <textarea
            value={noteDraft}
            onChange={(event) => setNoteDraft(event.target.value)}
            className="mt-4 min-h-28 w-full resize-y rounded-2xl border border-[var(--line)] bg-[#f7f7f4] p-3 text-sm outline-none transition focus:border-[var(--accent)]"
            placeholder="여기에 메모를 적어두세요."
          />
          {noteError && <p className="mt-2 text-xs text-red-600">{noteError}</p>}
          <div className="mt-3 flex justify-end gap-2">
            <button type="button" onClick={clearSelectionLookup} className="rounded-full px-4 py-2 text-xs font-bold text-[var(--muted)] hover:bg-[#f3f3ef]">취소</button>
            <button type="button" onClick={saveNote} disabled={savingNote} className="rounded-full bg-[var(--accent)] px-4 py-2 text-xs font-bold text-white hover:bg-[var(--accent-dark)] disabled:cursor-not-allowed disabled:opacity-60">{savingNote ? "저장 중" : "저장"}</button>
          </div>
        </aside>
      )}
      {notes.length > 0 && (
        <section className="rounded-2xl border border-[var(--line)] bg-white p-4 text-sm leading-6 tracking-normal">
          <div className="flex items-center gap-2">
            <StickyNote size={16} className="text-[var(--accent)]" />
            <h3 className="font-bold">내 메모</h3>
            <span className="text-xs text-[var(--muted)]">{notes.length}개</span>
          </div>
          <div className="mt-3 grid gap-2">
            {notes.map((note) => (
              <article key={note.id} className="rounded-xl bg-[#f7f7f4] p-3">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="break-words text-xs font-bold text-[var(--accent)]">{note.selected_text}</p>
                    <p className="mt-1 whitespace-pre-wrap break-words text-sm text-[var(--muted)]">{note.note_text}</p>
                  </div>
                  <button
                    type="button"
                    onClick={() => deleteNote(note.id)}
                    disabled={deletingNoteId === note.id}
                    className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-red-500 transition hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-60"
                    aria-label="메모 삭제"
                    title="메모 삭제"
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              </article>
            ))}
          </div>
        </section>
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
                      {entry.source === "ai" && <span className="rounded-full bg-[#f7f1eb] px-2 py-0.5 text-[10px] font-bold text-[var(--accent)]">AI</span>}
                      {entry.isCommon && <span className="rounded-full bg-[#f1eee7] px-2 py-0.5 text-[10px] font-bold">common</span>}
                    </div>
                    <button
                      type="button"
                      disabled={entry.isSaved || savingKey === `entry-${entry.id}`}
                      onClick={() => saveDictionaryItem(
                        entry.source === "ai"
                          ? {
                              aiEntry: {
                                dictionaryForm: entry.primarySpelling ?? entry.primaryReading,
                                reading: entry.primaryReading,
                                meaningKo: entry.glosses[0] ?? "",
                                partOfSpeech: entry.partsOfSpeech[0] ?? null,
                              },
                            }
                          : { entryId: entry.id },
                        `entry-${entry.id}`,
                      )}
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
