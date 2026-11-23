"use client";

import { useEffect, useLayoutEffect, useRef, useState, type PointerEvent as ReactPointerEvent, type ReactNode } from "react";
import type { TrackReference } from "@livekit/components-react";
import { StageGlow } from "./StageGlow";

export function CallLayout({
  agentImageUrl,
  avatarTrack,
  narrow,
  transcriptOpen,
  onToggleTranscript,
  portrait,
  controls,
  dock,
  suggestions,
  messages,
  composer,
}: {
  agentImageUrl?: string;
  avatarTrack?: TrackReference | null;
  narrow: boolean;
  transcriptOpen: boolean;
  onToggleTranscript?: () => void;
  portrait: ReactNode;
  /** Hang up, mute, and transcript. Omitted before the call is ringing. */
  controls?: ReactNode;
  /** Pre-call fields or the calling pill, over the bottom of the portrait. */
  dock?: ReactNode;
  suggestions?: ReactNode;
  messages: ReactNode;
  composer: ReactNode;
}) {
  const sheet = narrow && !dock;
  // A tap on the video clears the controls and the sheet. The next tap brings them back.
  // A tap that starts on the sheet, including a second tap on the field, never counts.
  const [chromeHidden, setChromeHidden] = useState(false);
  const fromSheet = useRef(false);
  const fieldFocused = useRef(false);
  useEffect(() => {
    if (!sheet) setChromeHidden(false);
  }, [sheet]);

  return (
    <div
      className="ls-stage"
      data-narrow={narrow ? "" : undefined}
      data-sheet={sheet ? "" : undefined}
      data-chrome-hidden={chromeHidden ? "" : undefined}
    >
      <div
        className="ls-visual"
        onPointerDownCapture={(event) => {
          const target = event.target instanceof Element ? event.target : null;
          const box = event.currentTarget.querySelector(".ls-sheet")?.getBoundingClientRect();
          const onSheet =
            Boolean(target?.closest(".ls-sheet")) ||
            Boolean(
              box &&
                event.clientX >= box.left &&
                event.clientX <= box.right &&
                event.clientY >= box.top &&
                event.clientY <= box.bottom,
            );
          fromSheet.current = onSheet;
          const active = document.activeElement;
          fieldFocused.current =
            active instanceof HTMLElement && (active.tagName === "INPUT" || active.tagName === "TEXTAREA");
        }}
      >
        {!narrow && <StageGlow agentImageUrl={agentImageUrl} avatarTrack={avatarTrack} />}
        <div className="ls-hero">
          <div className="ls-portrait-wrap">
            {portrait}
            {!narrow && dock ? <div className="ls-dock">{dock}</div> : null}
            {!narrow && controls ? <div className="ls-side-controls">{controls}</div> : null}
          </div>
          {sheet ? (
            <button
              type="button"
              className="ls-chrome-toggle"
              aria-label={chromeHidden ? "Show call controls" : "Hide call controls"}
              aria-hidden={chromeHidden ? undefined : true}
              tabIndex={chromeHidden ? 0 : -1}
              onPointerDown={(event) => {
                // The field's tap can land here after the sheet moves. Don't steal focus from it.
                if (fromSheet.current) event.preventDefault();
              }}
              onClick={(event) => {
                if (fromSheet.current) {
                  // A retargeted click can focus this button and blur the field. Put the caret back.
                  event.preventDefault();
                  const field = event.currentTarget.closest(".ls-visual")?.querySelector(".ls-sheet input, .ls-sheet textarea");
                  if (field instanceof HTMLElement && document.activeElement !== field) field.focus({ preventScroll: true });
                  return;
                }
                // The keyboard was up. This tap only dismisses it. The next one hides the chrome.
                if (fieldFocused.current) return;
                setChromeHidden((hidden) => !hidden);
              }}
            />
          ) : null}
        </div>
        <div className="ls-chrome" data-hidden={chromeHidden ? "" : undefined} inert={chromeHidden || undefined}>
          {narrow && controls ? <div className="ls-corner-controls">{controls}</div> : null}
          {narrow && dock ? <div className="ls-dock">{dock}</div> : null}
          {sheet ? (
            <CallSheet
              open={transcriptOpen}
              onToggle={onToggleTranscript}
              messages={messages}
              suggestions={suggestions}
              composer={composer}
            />
          ) : null}
        </div>
      </div>
      {!narrow && transcriptOpen ? (
        <aside className="ls-transcript">
          {messages}
          <div className="ls-transcript-foot">
            {suggestions}
            {composer}
          </div>
        </aside>
      ) : null}
    </div>
  );
}

/** A flick faster than this, in pixels per millisecond, picks the stop in that direction. */
const FLING = 0.45;
/** Movement below this is a tap on the handle. */
const TAP = 6;

type Drag = {
  id: number;
  x: number;
  y: number;
  originY: number;
  h: number;
  lastY: number;
  lastT: number;
  v: number;
  active: boolean;
  fromHandle: boolean;
  inThread: boolean;
};

/**
 * The phone sheet. Its height follows the finger, then settles into the collapsed bar or the
 * transcript. A flick commits even when the finger has not crossed the midpoint.
 */
function CallSheet({
  open,
  onToggle,
  messages,
  suggestions,
  composer,
}: {
  open: boolean;
  onToggle?: () => void;
  messages: ReactNode;
  suggestions?: ReactNode;
  composer: ReactNode;
}) {
  const sheetRef = useRef<HTMLDivElement>(null);
  const drag = useRef<Drag | null>(null);
  const skipClick = useRef(false);
  const openRef = useRef(open);
  const heightRef = useRef<number | null>(null);
  const [height, setHeight] = useState<number | null>(null);
  const [dragging, setDragging] = useState(false);
  openRef.current = open;
  heightRef.current = height;

  const stops = () => {
    const sheet = sheetRef.current;
    const chrome = sheet?.parentElement;
    if (!sheet || !chrome) return null;
    const closed = closedHeight(sheet);
    if (closed <= 0) return null;
    const room = chrome.getBoundingClientRect().height;
    const expanded = Math.max(closed, Math.min(room * 0.52, room - 96));
    return { closed, expanded };
  };

  useLayoutEffect(() => {
    const sheet = sheetRef.current;
    const chrome = sheet?.parentElement;
    if (!sheet || !chrome) return;
    const apply = () => {
      if (drag.current?.active) return;
      if (!openRef.current) {
        setHeight(null);
        return;
      }
      const next = stops();
      if (next) setHeight(next.expanded);
    };
    apply();
    const observer = new ResizeObserver(apply);
    observer.observe(chrome);
    const foot = sheet.querySelector(".ls-sheet-foot");
    if (foot) observer.observe(foot);
    return () => observer.disconnect();
  }, [open]);

  const onPointerDown = (event: ReactPointerEvent<HTMLDivElement>) => {
    if (event.button !== 0) return;
    const sheet = sheetRef.current;
    if (!sheet) return;
    const target = event.target;
    const fromHandle = target instanceof Element && Boolean(target.closest(".ls-sheet-handle"));
    drag.current = {
      id: event.pointerId,
      x: event.clientX,
      y: event.clientY,
      originY: event.clientY,
      h: sheet.getBoundingClientRect().height,
      lastY: event.clientY,
      lastT: performance.now(),
      v: 0,
      active: fromHandle,
      fromHandle,
      inThread: target instanceof Element && Boolean(target.closest(".ls-sheet-log")),
    };
    if (fromHandle) {
      // Lock the collapsed height before the transcript mounts, or the sheet jumps open.
      setHeight(sheet.getBoundingClientRect().height);
      setDragging(true);
      sheet.setPointerCapture(event.pointerId);
    }
  };

  const onPointerMove = (event: ReactPointerEvent<HTMLDivElement>) => {
    const gesture = drag.current;
    const sheet = sheetRef.current;
    if (!gesture || !sheet || event.pointerId !== gesture.id) return;
    const dy = event.clientY - gesture.y;
    const dx = event.clientX - gesture.x;
    if (!gesture.active) {
      if (Math.abs(dy) < 8 || Math.abs(dy) < Math.abs(dx) * 1.5) return;
      if (gesture.inThread) {
        const scroller = threadScroller(event.target);
        if (!(dy > 0 && (scroller?.scrollTop ?? 0) <= 0)) return;
      }
      gesture.active = true;
      gesture.y = event.clientY;
      gesture.h = sheet.getBoundingClientRect().height;
      setHeight(gesture.h);
      sheet.setPointerCapture(event.pointerId);
      setDragging(true);
    }
    const now = performance.now();
    const dt = now - gesture.lastT;
    if (dt > 0) gesture.v = gesture.v * 0.65 + ((event.clientY - gesture.lastY) / dt) * 0.35;
    gesture.lastY = event.clientY;
    gesture.lastT = now;
    const next = stops();
    if (!next) return;
    setHeight(follow(gesture.h - (event.clientY - gesture.y), next.closed, next.expanded));
  };

  const finish = (gesture: Drag, toOpen: boolean) => {
    const next = stops();
    setDragging(false);
    if (!next) {
      setHeight(null);
      return;
    }
    // Closed rests on its content. A pixel height in between is what leaves one faded line showing.
    setHeight(toOpen ? next.expanded : null);
    if (toOpen !== openRef.current) onToggle?.();
    if (gesture.fromHandle && Math.abs(gesture.lastY - gesture.originY) >= TAP) skipClick.current = true;
  };

  const onPointerUp = (event: ReactPointerEvent<HTMLDivElement>) => {
    const gesture = drag.current;
    if (!gesture || event.pointerId !== gesture.id) return;
    drag.current = null;
    if (!gesture.active) {
      setDragging(false);
      return;
    }
    const next = stops();
    if (!next) {
      setDragging(false);
      setHeight(null);
      return;
    }
    const travel = Math.abs(event.clientY - gesture.originY);
    if (gesture.fromHandle && travel < TAP) {
      // Pointer capture sends the click to the sheet, so the handle button never sees it.
      skipClick.current = true;
      setDragging(false);
      const toOpen = !openRef.current;
      setHeight(toOpen ? next.expanded : null);
      onToggle?.();
      return;
    }
    suppressClick(event.currentTarget);
    const current = heightRef.current ?? gesture.h;
    const projected = current - gesture.v * 160;
    const toOpen = gesture.v < -FLING ? true : gesture.v > FLING ? false : projected > (next.closed + next.expanded) / 2;
    finish(gesture, toOpen);
  };

  const onPointerCancel = (event: ReactPointerEvent<HTMLDivElement>) => {
    const gesture = drag.current;
    if (!gesture || event.pointerId !== gesture.id) return;
    drag.current = null;
    if (!gesture.active) {
      setDragging(false);
      return;
    }
    const next = stops();
    const current = heightRef.current ?? gesture.h;
    const toOpen = next ? current - gesture.v * 160 > (next.closed + next.expanded) / 2 : openRef.current;
    finish(gesture, toOpen);
  };

  return (
    <div
      ref={sheetRef}
      className="ls-sheet"
      data-open={open ? "" : undefined}
      data-collapsed={!open && !dragging ? "" : undefined}
      data-ready={height != null || !open ? "" : undefined}
      data-dragging={dragging ? "" : undefined}
      style={height == null ? undefined : { height }}
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={onPointerUp}
      onPointerCancel={onPointerCancel}
      onLostPointerCapture={onPointerCancel}
    >
      <button
        type="button"
        className="ls-sheet-handle"
        aria-label={open ? "Hide transcript" : "Show transcript"}
        aria-expanded={open}
        onClick={() => {
          if (skipClick.current) {
            skipClick.current = false;
            return;
          }
          onToggle?.();
        }}
      />
      <div className="ls-sheet-log">{messages}</div>
      <div className="ls-sheet-foot">
        {suggestions}
        {composer}
      </div>
    </div>
  );
}

/** Height of the sheet with the transcript squeezed out. */
function closedHeight(sheet: HTMLElement) {
  const style = getComputedStyle(sheet);
  const pad = parseFloat(style.paddingTop) + parseFloat(style.paddingBottom);
  const handle = sheet.querySelector(".ls-sheet-handle");
  const foot = sheet.querySelector(".ls-sheet-foot");
  const footGap = foot ? parseFloat(getComputedStyle(foot).marginTop) || 0 : 0;
  return pad + (handle instanceof HTMLElement ? handle.offsetHeight : 0) + footGap + (foot instanceof HTMLElement ? foot.offsetHeight : 0);
}

/** Past either stop the sheet lags behind the finger, so the edge is obvious and it can spring back. */
function follow(value: number, min: number, max: number) {
  if (value < min) return min - (min - value) * 0.22;
  if (value > max) return max + (value - max) * 0.22;
  return value;
}

function threadScroller(target: EventTarget | null) {
  if (!(target instanceof Element)) return null;
  const scroller = target.closest("[aria-label='Transcript']");
  return scroller instanceof HTMLElement ? scroller : null;
}

/** A drag that began on a pill or the field should not also activate it. */
function suppressClick(sheet: HTMLElement) {
  const stop = (event: Event) => {
    event.preventDefault();
    event.stopPropagation();
    sheet.removeEventListener("click", stop, true);
  };
  sheet.addEventListener("click", stop, true);
}
