"use client";

import { useState } from "react";
import { ArrowUpIcon } from "./icons";

export function Composer({
  onSend,
  disabled = false,
  className = "",
}: {
  onSend: (text: string) => void | Promise<void>;
  disabled?: boolean;
  className?: string;
}) {
  const [value, setValue] = useState("");
  const [sending, setSending] = useState(false);

  const submit = async () => {
    const next = value.trim();
    if (!next || disabled || sending) return;
    setSending(true);
    try {
      await onSend(next);
      setValue("");
    } catch (error) {
      console.error("[lemonslice] could not send the message:", error);
    } finally {
      setSending(false);
    }
  };

  return (
    <form
      className={`flex h-11 min-w-0 items-center rounded-[22px] bg-[var(--ls-composer-bg)] pr-2 ${className}`}
      onSubmit={(event) => {
        event.preventDefault();
        submit();
      }}
    >
      <input
        value={value}
        onChange={(event) => setValue(event.target.value)}
        placeholder="Message"
        aria-label="Message"
        enterKeyHint="send"
        autoComplete="off"
        disabled={disabled || sending}
        maxLength={2000}
        className="min-w-0 flex-1 bg-transparent pl-4 text-sm tracking-[-0.125px] text-[var(--ls-composer-fg)] placeholder:text-[var(--ls-placeholder)] disabled:opacity-50"
      />
      <button
        type="submit"
        aria-label="Send message"
        disabled={disabled || sending || value.trim().length === 0}
        className="flex h-7 w-11 shrink-0 items-center justify-center rounded-[24px] bg-[var(--ls-send-bg)] text-[var(--ls-send-fg)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--ls-focus)] disabled:cursor-default"
      >
        <ArrowUpIcon />
      </button>
    </form>
  );
}
