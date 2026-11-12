"use client";

import { useEffect, useState } from "react";
import chevronRight from "./assets/chevron-right.svg";

/**
 * A pill on the video. A plain string is `{ label }`. Tapping one sends its label as the
 * visitor's line; if another action is already in flight, she answers it but does not perform it.
 */
export type Suggestion = string | SuggestionPill;

export type SuggestionPill = {
  /** Shown on the pill and sent as the visitor's line. */
  label: string;
  /** Hide after this many visitor messages (spoken, typed, or a tapped pill). Omit to keep it for the call. */
  turns?: number;
  /** Scene change: the clip ends on this public https image, which then stays as the reference. */
  image?: string;
  /** Scene pills only. Replaces the default scene clip prompt; the agent appends its scene rules. */
  prompt?: string;
};

/** How long a tapped pill shows its spinner, so the tap visibly registers. */
const BUSY_MS = 1000;

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
  const [busy, setBusy] = useState<string | null>(null);

  useEffect(() => {
    if (busy == null) return;
    const timer = setTimeout(() => setBusy(null), BUSY_MS);
    return () => clearTimeout(timer);
  }, [busy]);

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
      {pills.map((pill, index) => {
        const key = `${pill.label}-${index}`;
        const isBusy = busy === key;
        return (
          <button
            key={key}
            type="button"
            className="ls-suggestion"
            disabled={isBusy}
            onClick={() => {
              setBusy(key);
              onSelect(pill);
            }}
          >
            {pill.image && <img className="ls-suggestion-thumb" src={pill.image} alt="" width={24} height={24} />}
            <span>{pill.label}</span>
            {isBusy ? (
              <span className="ls-suggestion-spinner" aria-hidden />
            ) : (
              <img src={chevronRight} alt="" width={20} height={20} />
            )}
          </button>
        );
      })}
    </div>
  );
}
