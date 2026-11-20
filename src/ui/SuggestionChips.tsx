"use client";

import { useEffect, useLayoutEffect, useRef, useState, type CSSProperties } from "react";

/** A pill on the video; a string is `{ label }`. */
export type Suggestion = string | SuggestionPill;

export type SuggestionPill = {
  /** Shown on the pill. Sent as the visitor's line unless `chatMessage` is set. */
  label: string;
  /** Sent as the visitor's line in place of the label; the transcript shows it. For a longer description than fits a pill. */
  chatMessage?: string;
  /** Hide after this many visitor messages (spoken, typed, or a tapped pill). Omit to keep it for the call. */
  turns?: number;
  /** Keep an action pill after a tap so it can be tapped again. Off by default. Scene pills always stay. */
  sticky?: boolean;
  /** Scene change: the clip ends on this public https image, which then stays as the reference. */
  image?: string;
  /** Scene pills only. Replaces the default scene clip prompt; the agent appends its scene rules. */
  roleplayPrompt?: string;
  /** @deprecated Use `roleplayPrompt`. Ignored when both are set. */
  prompt?: string;
};

/** The sending sweep on a tapped pill; the action pill is removed when it ends. */
const BUSY_MS = 2000;
/** How long a dismissed pill takes to close up. */
const DISMISS_MS = 240;

/** How long the right-edge dissolve is, in px. Masked per pill: a mask on the row would kill the blur. */
const FADE_LENGTH = 24;

export function toPill(item: Suggestion): SuggestionPill {
  return typeof item === "string" ? { label: item } : item;
}

/** Tells pills apart, including an action and a scene pill with the same label. */
const pillId = (pill: SuggestionPill) => `${pill.label}\0${pill.image ?? ""}`;

export function SuggestionChips({
  pills,
  onSelect,
  disabled = false,
}: {
  pills: readonly SuggestionPill[];
  onSelect: (pill: SuggestionPill) => void;
  /** While an action is in flight on the agent. */
  disabled?: boolean;
}) {
  const [busy, setBusy] = useState<{ id: string; leaves: boolean } | null>(null);
  const [used, setUsed] = useState<readonly string[]>([]);
  const [dismissing, setDismissing] = useState<readonly string[]>([]);
  const scroller = useRef<HTMLDivElement>(null);
  const [canAdvance, setCanAdvance] = useState(false);

  useEffect(() => {
    if (busy == null) return;
    const { id, leaves } = busy;
    const timer = setTimeout(() => {
      if (leaves) setUsed((current) => [...current, id]);
      setBusy(null);
    }, BUSY_MS);
    return () => clearTimeout(timer);
  }, [busy]);

  useEffect(() => {
    if (dismissing.length === 0) return;
    const timer = setTimeout(() => {
      setUsed((current) => [...current, ...dismissing]);
      setDismissing([]);
    }, DISMISS_MS);
    return () => clearTimeout(timer);
  }, [dismissing]);

  // Tapped action pills leave unless sticky; dismissed pills leave. Scene pills stay; the current image's pill is hidden upstream.
  const shown = pills.filter((pill) => !used.includes(pillId(pill)));
  const layoutKey = shown.map(pillId).join("\n");

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

  if (shown.length === 0) return null;

  return (
    <div
      className="ls-suggestions-wrap"
      style={{ "--ls-sending-ms": `${BUSY_MS}ms`, "--ls-dismiss-ms": `${DISMISS_MS}ms` } as CSSProperties}
    >
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
        {shown.map((pill) => {
          const id = pillId(pill);
          const isBusy = busy?.id === id;
          const isDismissing = dismissing.includes(id);
          const sending = isBusy ? (busy.leaves ? "leave" : "stay") : undefined;
          return (
            <span
              key={id}
              className="ls-suggestion-item"
              data-leaving={isDismissing ? "dismiss" : sending === "leave" ? "send" : undefined}
            >
              <button
                type="button"
                className="ls-suggestion"
                data-sending={sending}
                disabled={disabled || busy != null || isDismissing}
                onClick={() => {
                  setBusy({ id, leaves: !pill.image && !pill.sticky });
                  onSelect(pill);
                }}
              >
                {pill.image && <img className="ls-suggestion-thumb" src={pill.image} alt="" width={24} height={24} />}
                <span>{pill.label}</span>
              </button>
              <button
                type="button"
                className="ls-suggestion-dismiss"
                aria-label={`Dismiss ${pill.label}`}
                disabled={disabled || busy != null || isDismissing}
                onClick={() => setDismissing((current) => [...current, id])}
              >
                <CloseIcon />
              </button>
            </span>
          );
        })}
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
  const limit = rowBox.right - fadeBand(row).clearAt;
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
  // Land the pill at the row's own padding, so the previous pill is nearly or fully off the edge.
  const inset = parseFloat(getComputedStyle(row).paddingLeft) || 0;
  const delta = next.getBoundingClientRect().left - rowBox.left - inset;
  row.scrollTo({ left: row.scrollLeft + delta, behavior });
}

/**
 * Where the dissolve runs, in px from the row's right edge: fully visible at `clearAt`, gone at
 * `goneAt`. Sized to the "more" button (a pill-height circle, sitting just inside the row inset),
 * so the smaller pills of the narrow layout free up more of the row.
 */
function fadeBand(row: HTMLElement) {
  const inset = parseFloat(getComputedStyle(row).paddingRight) || 16;
  const pill = row.querySelector<HTMLElement>(".ls-suggestion");
  const button = pill?.offsetHeight || 44;
  const goneAt = inset + button;
  return { goneAt, clearAt: goneAt + FADE_LENGTH };
}

/** Dissolve only the pill crossing the right edge. The mask stays on that pill, not the row. */
function fadeEdge(row: HTMLElement, overflow: boolean) {
  const rowBox = row.getBoundingClientRect();
  const band = fadeBand(row);
  const clearAt = rowBox.right - band.clearAt;
  const goneAt = rowBox.right - band.goneAt;
  for (const pill of row.querySelectorAll<HTMLElement>(".ls-suggestion, .ls-suggestion-dismiss")) {
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

function CloseIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 14 14" fill="none" aria-hidden>
      <path stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" d="M3.5 3.5l7 7m0-7l-7 7" />
    </svg>
  );
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
