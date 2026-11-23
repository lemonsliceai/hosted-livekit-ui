const FOCUS =
  "focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--ls-focus)]";

export const controlButton = [
  "inline-flex shrink-0 items-center justify-center rounded-full border-0",
  "bg-[var(--ls-glass)] text-[var(--ls-icon)] shadow-[inset_0_0_0_1px_var(--ls-glass-border)] backdrop-blur-[8px] transition-colors",
  "hover:bg-[var(--ls-glass-hover)] disabled:opacity-40",
  FOCUS,
].join(" ");

export const controlButtonOn = "ls-on";

export const hangupButton = [
  "inline-flex shrink-0 items-center justify-center rounded-full border-0",
  "bg-[var(--ls-hangup)] text-white shadow-[inset_0_0_0_1px_var(--ls-glass-border)] backdrop-blur-[8px] transition-colors hover:bg-[var(--ls-hangup-hover)]",
  FOCUS,
].join(" ");

export const startButton = [
  "inline-flex shrink-0 items-center justify-center gap-1.5 whitespace-nowrap rounded-full border-0",
  "bg-[var(--ls-start-bg)] px-5 py-3 text-base font-semibold leading-none shadow-[inset_0_0_0_1px_var(--ls-start-border)]",
  "text-[var(--ls-start-fg)] backdrop-blur-[8px] transition-colors hover:bg-[var(--ls-start-bg-hover)]",
  FOCUS,
].join(" ");

export const controlSize = "px-5 py-3";
export const controlSizeCompact = "size-11";
export const hangupSize = "px-5 py-3";
export const hangupSizeCompact = "size-11";
