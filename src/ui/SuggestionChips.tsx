"use client";

import chevronRight from "./assets/chevron-right.svg";

/** Shown when `suggestions` is not passed. Pass `false` on `LemonSliceCall` to hide them. */
export const DEFAULT_SUGGESTIONS: readonly string[] = [
  "Pet a cat",
  "Show me a dance move",
  "Give me a rose",
  "Celebrate with me",
];

export function SuggestionChips({
  suggestions,
  onSelect,
}: {
  suggestions: readonly string[];
  onSelect: (text: string) => void;
}) {
  const items = suggestions.map((item) => item.trim()).filter(Boolean);
  if (items.length === 0) return null;

  return (
    <div
      className="ls-suggestions"
      role="group"
      aria-label="Suggestions"
      onWheel={(event) => {
        if (event.deltaY === 0) return;
        event.currentTarget.scrollLeft += event.deltaY;
      }}
    >
      {items.map((text, index) => (
        <button key={`${text}-${index}`} type="button" className="ls-suggestion" onClick={() => onSelect(text)}>
          <span>{text}</span>
          <img src={chevronRight} alt="" width={20} height={20} />
        </button>
      ))}
    </div>
  );
}
