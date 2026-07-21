export type HighlightColorKey = "honey" | "peach" | "lavender" | "sage" | "mint" | "sky" | "rose";

export type HighlightColorOption = {
  key: HighlightColorKey;
  label: string;
  className: string;
  swatchClassName: string;
};

export const highlightColorOptions: HighlightColorOption[] = [
  {
    key: "honey",
    label: "허니 옐로",
    className: "bg-[#ffe8a3]/70 hover:bg-[#ffd866] focus:bg-[#ffd866]",
    swatchClassName: "bg-[#ffe8a3]",
  },
  {
    key: "peach",
    label: "피치",
    className: "bg-[#ffd9ca]/75 hover:bg-[#ffc2ad] focus:bg-[#ffc2ad]",
    swatchClassName: "bg-[#ffd9ca]",
  },
  {
    key: "lavender",
    label: "라벤더",
    className: "bg-[#ddd7ff]/75 hover:bg-[#c9c0ff] focus:bg-[#c9c0ff]",
    swatchClassName: "bg-[#ddd7ff]",
  },
  {
    key: "sage",
    label: "세이지",
    className: "bg-[#dbecc9]/80 hover:bg-[#c7dfa9] focus:bg-[#c7dfa9]",
    swatchClassName: "bg-[#dbecc9]",
  },
  {
    key: "mint",
    label: "민트",
    className: "bg-[#c9f4e5]/80 hover:bg-[#9ce8cc] focus:bg-[#9ce8cc]",
    swatchClassName: "bg-[#c9f4e5]",
  },
  {
    key: "sky",
    label: "스카이",
    className: "bg-[#cfe8ff]/80 hover:bg-[#aed8ff] focus:bg-[#aed8ff]",
    swatchClassName: "bg-[#cfe8ff]",
  },
  {
    key: "rose",
    label: "로즈",
    className: "bg-[#ffd5df]/75 hover:bg-[#ffbdcd] focus:bg-[#ffbdcd]",
    swatchClassName: "bg-[#ffd5df]",
  },
];

export const defaultAnalysisHighlightColor: HighlightColorKey = "honey";
export const defaultLookupHighlightColor: HighlightColorKey = "mint";

export function getHighlightColorOption(key: string | null | undefined, fallback: HighlightColorKey) {
  return highlightColorOptions.find((option) => option.key === key) ?? highlightColorOptions.find((option) => option.key === fallback)!;
}
