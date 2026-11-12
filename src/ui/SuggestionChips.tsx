"use client";

import chevronRight from "./assets/chevron-right.svg";

/** A pill on the video. A plain string is `{ label }`. */
export type Suggestion = string | SuggestionPill;

export type SuggestionPill = {
  /** Shown on the pill and sent as the visitor's line. */
  label: string;
  /** Hide after this many visitor messages (spoken, typed, or a tapped pill). Omit to keep it for the call. */
  turns?: number;
  /** Scene change: the clip ends on this public https image, which then stays as the reference. */
  image?: string;
  /** Prompt for the scene clip. Defaults to the agent's. */
  prompt?: string;
};

export function toPill(item: Suggestion): SuggestionPill {
  return typeof item === "string" ? { label: item } : item;
}

export function SuggestionChips({
  pills,
  onSelect,
}: {
  pills: readonly SuggestionPill[];
  onSelect: (pill: SuggestionPill) => void;
}) {
  if (pills.length === 0) return null;

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
      {pills.map((pill, index) => (
        <button key={`${pill.label}-${index}`} type="button" className="ls-suggestion" onClick={() => onSelect(pill)}>
          {pill.image && <img className="ls-suggestion-thumb" src={pill.image} alt="" width={24} height={24} />}
          <span>{pill.label}</span>
          <img src={chevronRight} alt="" width={20} height={20} />
        </button>
      ))}
    </div>
  );
}
