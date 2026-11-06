"use client";

import { useEffect, useRef } from "react";
import type { TranscriptMessage } from "./useTranscript";

const INCOMING =
  "m-0 w-full rounded-bl-[4px] rounded-br-[18px] rounded-tl-[18px] rounded-tr-[18px] bg-[var(--ls-incoming-bg)] text-[var(--ls-incoming-fg)]";

const OUTGOING =
  "m-0 max-w-[85%] rounded-bl-[18px] rounded-br-[4px] rounded-tl-[18px] rounded-tr-[18px] bg-[var(--ls-outgoing-bg)] text-[var(--ls-outgoing-fg)]";

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

  useEffect(() => {
    const element = scroller.current;
    if (!element) return;
    element.scrollTop = element.scrollHeight;
  }, [messages]);

  return (
    <div
      ref={scroller}
      aria-label="Transcript"
      aria-live="polite"
      className={`min-h-0 flex-1 overflow-y-auto overscroll-contain ${fade ? "ls-fade-top" : ""} ${className}`}
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
              <p className={`px-4 py-[10px] text-base leading-6 ${message.role === "user" ? OUTGOING : INCOMING}`}>
                {message.text}
              </p>
            </div>
          ),
        )}
      </div>
    </div>
  );
}
