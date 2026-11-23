"use client";

import { useEffect, useLayoutEffect, useRef, useState } from "react";
import type { TranscriptMessage } from "./useTranscript";

const INCOMING = "m-0 w-full py-1 text-[var(--ls-fg)]";

const OUTGOING =
  "m-0 max-w-[85%] rounded-[22px] bg-[var(--ls-outgoing-bg)] px-4 py-[10px] text-[var(--ls-outgoing-fg)]";

function groupTurns(messages: TranscriptMessage[]) {
  const groups: TranscriptMessage[] = [];
  for (const message of messages) {
    const last = groups[groups.length - 1];
    if (last && last.kind === "transcription" && message.kind === "transcription" && last.role === message.role) {
      last.text = `${last.text} ${message.text}`.replace(/\s+/g, " ").trim();
    } else {
      groups.push({ ...message });
    }
  }
  return groups;
}

export function TranscriptThread({
  messages,
  fade = false,
  className = "",
}: {
  messages: TranscriptMessage[];
  fade?: boolean;
  className?: string;
}) {
  const scroller = useRef<HTMLDivElement>(null);
  const pinned = useRef(true);
  const seenUser = useRef<string | null>(null);
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const element = scroller.current;
    if (!element) return;

    const gap = () => element.scrollHeight - element.scrollTop - element.clientHeight;
    const hold = (next: boolean) => {
      pinned.current = next;
      // While we are holding the bottom, the browser's own anchoring fights that hold.
      element.style.overflowAnchor = next ? "none" : "";
    };
    let touchY = 0;
    let touching = false;

    const onScroll = () => {
      const fromBottom = gap();
      if (fromBottom > 48) hold(false);
      else if (!touching && fromBottom < 8) hold(true);
      setScrolled((current) => {
        const next = element.scrollTop > 1;
        return current === next ? current : next;
      });
    };
    const onWheel = (event: WheelEvent) => {
      if (event.deltaY < 0) hold(false);
    };
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "ArrowUp" || event.key === "PageUp" || event.key === "Home") hold(false);
    };
    const onTouchStart = (event: TouchEvent) => {
      touching = true;
      touchY = event.touches[0]?.clientY ?? 0;
    };
    const onTouchMove = (event: TouchEvent) => {
      const y = event.touches[0]?.clientY ?? touchY;
      // Finger moving down reads older lines. Release before the next token can pin us.
      if (y > touchY + 4) hold(false);
    };
    const onTouchEnd = () => {
      touching = false;
      if (gap() < 8) hold(true);
    };

    element.addEventListener("scroll", onScroll, { passive: true });
    element.addEventListener("wheel", onWheel, { passive: true });
    element.addEventListener("keydown", onKey);
    element.addEventListener("touchstart", onTouchStart, { passive: true });
    element.addEventListener("touchmove", onTouchMove, { passive: true });
    element.addEventListener("touchend", onTouchEnd);
    element.addEventListener("touchcancel", onTouchEnd);
    hold(true);
    return () => {
      element.removeEventListener("scroll", onScroll);
      element.removeEventListener("wheel", onWheel);
      element.removeEventListener("keydown", onKey);
      element.removeEventListener("touchstart", onTouchStart);
      element.removeEventListener("touchmove", onTouchMove);
      element.removeEventListener("touchend", onTouchEnd);
      element.removeEventListener("touchcancel", onTouchEnd);
      element.style.overflowAnchor = "";
    };
  }, []);

  useLayoutEffect(() => {
    const element = scroller.current;
    if (!element) return;
    const lastUser = [...messages].reverse().find((message) => message.role === "user");
    if (lastUser && lastUser.id !== seenUser.current) {
      seenUser.current = lastUser.id;
      pinned.current = true;
      element.style.overflowAnchor = "none";
    }
    if (!pinned.current) return;
    element.scrollTop = element.scrollHeight;
  }, [messages]);

  return (
    <div
      ref={scroller}
      aria-label="Transcript"
      className={`min-h-0 flex-1 overflow-y-auto overscroll-contain ${fade && scrolled ? "ls-fade-top" : ""} ${className}`}
    >
      <div className="flex flex-col gap-3">
        {groupTurns(messages).map((message) =>
          message.kind === "event" ? (
            <p
              key={message.id}
              className="px-4 text-center text-sm italic leading-6 text-[var(--ls-placeholder)]"
            >
              {message.text}
            </p>
          ) : (
            <div
              key={message.id}
              className={message.role === "user" ? "flex justify-end" : "flex"}
            >
              <p className={`text-base leading-6 ${message.role === "user" ? OUTGOING : INCOMING}`}>
                {message.text}
              </p>
            </div>
          ),
        )}
      </div>
    </div>
  );
}
