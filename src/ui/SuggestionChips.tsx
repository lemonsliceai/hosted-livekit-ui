"use client";

import { useLayoutEffect, useRef, useState } from "react";

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

export function toPill(item: Suggestion): SuggestionPill {
  return typeof item === "string" ? { label: item } : item;
}

/** A pill is fully gone this far from the row's right edge, just before the advance button. */
const FADE_END = 64;
/** The dissolve starts further left. Applied per pill: a mask on the row would kill their backdrop blur. */
const FADE_START = 96;

export function SuggestionChips({
  pills,
  onSelect,
}: {
  pills: readonly SuggestionPill[];
  onSelect: (pill: SuggestionPill) => void;
}) {
  const scroller = useRef<HTMLDivElement>(null);
  const [canAdvance, setCanAdvance] = useState(false);
  const layoutKey = pills.map((pill) => `${pill.label}\0${pill.image ?? ""}`).join("\n");

  useLayoutEffect(() => {
    const row = scroller.current;
    if (!row) return;
    const measure = () => {
      const overflow = row.scrollLeft + row.clientWidth < row.scrollWidth - 2;
      setCanAdvance(overflow);
      fadeEdge(row, overflow);
    };
    measure();
    row.addEventListener("scroll", measure, { passive: true });
    const observer = new ResizeObserver(measure);
    observer.observe(row);
    return () => {
      row.removeEventListener("scroll", measure);
      observer.disconnect();
    };
  }, [layoutKey]);

  if (pills.length === 0) return null;

  return (
    <div className="ls-suggestions-wrap">
      <div
        ref={scroller}
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
          </button>
        ))}
      </div>
      {canAdvance && (
        <button
          type="button"
          className="ls-suggestions-next"
          aria-label="More suggestions"
          onClick={() => advanceSuggestions(scroller.current)}
        >
          <ChevronRight />
        </button>
      )}
    </div>
  );
}

/** Bring the next pill that fades off the right edge fully into view. */
function advanceSuggestions(row: HTMLDivElement | null) {
  if (!row) return;
  const rowBox = row.getBoundingClientRect();
  const limit = rowBox.right - FADE_START;
  // Skip a pill that already starts at the left, even if it runs into the fade.
  const next = [...row.querySelectorAll<HTMLElement>(".ls-suggestion")].find((pill) => {
    const box = pill.getBoundingClientRect();
    return box.right > limit + 4 && box.left > rowBox.left + 20;
  });
  const behavior = window.matchMedia("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth";
  if (!next) {
    row.scrollTo({ left: row.scrollWidth, behavior });
    return;
  }
  const delta = next.getBoundingClientRect().left - rowBox.left - 16;
  row.scrollTo({ left: row.scrollLeft + delta, behavior });
}

/** Dissolve only the pill crossing the right edge. The mask stays on that pill, not the row. */
function fadeEdge(row: HTMLElement, overflow: boolean) {
  const rowBox = row.getBoundingClientRect();
  const clearAt = rowBox.right - FADE_START;
  const goneAt = rowBox.right - FADE_END;
  for (const pill of row.querySelectorAll<HTMLElement>(".ls-suggestion")) {
    if (!overflow) {
      setFade(pill, "");
      continue;
    }
    const box = pill.getBoundingClientRect();
    if (box.right <= clearAt + 0.5) {
      setFade(pill, "");
      continue;
    }
    const start = Math.max(0, clearAt - box.left);
    const end = Math.max(start + 1, goneAt - box.left);
    setFade(pill, `linear-gradient(to right, #000 ${start}px, transparent ${end}px)`);
  }
}

function setFade(pill: HTMLElement, mask: string) {
  if (pill.dataset.fade === mask) return;
  pill.dataset.fade = mask;
  pill.style.maskImage = mask;
  pill.style.setProperty("-webkit-mask-image", mask);
}

function ChevronRight() {
  return (
    <svg width="20" height="20" viewBox="0 0 20 20" fill="none" aria-hidden>
      <path
        fill="currentColor"
        fillRule="evenodd"
        d="M7.77459 5.27459C8.1407 4.90847 8.7343 4.90847 9.10041 5.27459L13.1629 9.33709C13.529 9.7032 13.529 10.2968 13.1629 10.6629L9.10041 14.7254C8.7343 15.0915 8.1407 15.0915 7.77459 14.7254C7.40847 14.3593 7.40847 13.7657 7.77459 13.3996L11.1742 10L7.77459 6.60041C7.40847 6.2343 7.40847 5.6407 7.77459 5.27459Z"
      />
    </svg>
  );
}
