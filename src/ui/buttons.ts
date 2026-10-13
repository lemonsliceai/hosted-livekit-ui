const BASE =
  "inline-flex items-center justify-center gap-2 whitespace-nowrap text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:shrink-0";

const SOLID =
  "bg-[rgb(var(--ls-primary-rgb))] text-[rgb(var(--ls-primary-foreground-rgb))] hover:bg-[rgb(var(--ls-primary-rgb)/0.9)]";

const OUTLINE =
  "border border-[rgb(var(--ls-border-rgb))] bg-transparent text-[rgb(var(--ls-foreground-rgb))] hover:bg-[rgb(var(--ls-muted-rgb))]";

const DESTRUCTIVE =
  "bg-[rgb(var(--ls-destructive-rgb))] text-[rgb(var(--ls-destructive-foreground-rgb))] hover:bg-[rgb(var(--ls-destructive-rgb)/0.9)]";

/** Round 44px icon button */
export const iconButton = {
  solid: `${BASE} h-11 w-11 rounded-full ${SOLID}`,
  outline: `${BASE} h-11 w-11 rounded-full ${OUTLINE}`,
  destructive: `${BASE} h-11 w-11 rounded-full shrink-0 ${DESTRUCTIVE}`,
};

/** Wide pill used for "Start call" and the disabled "Calling…" state. */
export const pillButton = `${BASE} h-11 px-6 rounded-full ${SOLID}`;
