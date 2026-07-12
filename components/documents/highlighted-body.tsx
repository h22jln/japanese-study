type HighlightWord = {
  surface_form: string | null;
  vocabulary: {
    dictionary_form: string;
    reading: string;
    meaning_ko: string;
    part_of_speech: string | null;
  };
};

function escapeRegExp(value: string) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

export function HighlightedBody({ text, words }: { text: string; words: HighlightWord[] }) {
  const lookup = new Map<string, HighlightWord>();
  for (const word of words) {
    if (word.surface_form?.trim()) lookup.set(word.surface_form.trim(), word);
    if (word.vocabulary.dictionary_form.trim()) lookup.set(word.vocabulary.dictionary_form.trim(), word);
  }

  const terms = [...lookup.keys()].sort((a, b) => b.length - a.length);
  const matcher = terms.length > 0 ? new RegExp(`(${terms.map(escapeRegExp).join("|")})`, "g") : null;
  const paragraphs = text.split(/\n\s*\n/).filter((paragraph) => paragraph.trim());

  return (
    <div className="space-y-6 text-[1.05rem] leading-9 tracking-[.01em] text-[#30312c] sm:text-lg sm:leading-10">
      {paragraphs.map((paragraph, paragraphIndex) => (
        <p key={paragraphIndex} className="whitespace-pre-wrap break-words">
          {(matcher ? paragraph.split(matcher) : [paragraph]).map((part, index) => {
            const word = lookup.get(part);
            if (!word) return <span key={index}>{part}</span>;
            return (
              <span key={index} tabIndex={0} className="group relative inline cursor-help rounded bg-[#ffe8a3]/70 px-0.5 outline-none transition hover:bg-[#ffd866] focus:bg-[#ffd866]">
                {part}
                <span role="tooltip" className="pointer-events-none absolute bottom-[calc(100%+.45rem)] left-0 z-30 hidden w-56 rounded-xl bg-[#20201d] p-3 text-left text-sm leading-5 tracking-normal text-white shadow-xl group-hover:block group-focus:block">
                  <strong className="block text-base">{word.vocabulary.dictionary_form}</strong>
                  <span className="mt-1 block text-white/65">{word.vocabulary.reading}{word.vocabulary.part_of_speech ? ` · ${word.vocabulary.part_of_speech}` : ""}</span>
                  <span className="mt-2 block">{word.vocabulary.meaning_ko}</span>
                </span>
              </span>
            );
          })}
        </p>
      ))}
    </div>
  );
}
