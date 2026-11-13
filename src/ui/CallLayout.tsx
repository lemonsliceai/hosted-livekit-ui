"use client";

import { useLayoutEffect, useRef, useState, type PointerEvent, type ReactNode, type RefObject } from "react";
import { AgentImage } from "./AvatarStage";

const MIN_SHEET = 0.32;
const MAX_SHEET = 0.82;
const CARD_RATIO = 416 / 672;
/** Voice row: 20px label + 6px gap + 40px select. Taller than the call buttons. */
const TOOLBAR_SLOT = 66;

function clampSheet(value: number) {
  return Math.min(MAX_SHEET, Math.max(MIN_SHEET, value));
}

function useCardSize(
  slotRef: RefObject<HTMLElement | null>,
  toolbarRef: RefObject<HTMLElement | null>,
  mode: "centered" | "pinned" | "sheet",
) {
  const [size, setSize] = useState({ width: 320, height: 480 });

  useLayoutEffect(() => {
    const slot = slotRef.current;
    if (!slot) return;

    const measure = () => {
      const padX = mode === "centered" ? 48 : 22;
      const padY = mode === "centered" ? 80 : mode === "pinned" ? 44 : 0;
      const gap = mode === "centered" ? 24 : 0;
      const toolbar = mode === "sheet" ? 0 : (toolbarRef.current?.offsetHeight ?? 0);
      // Grow with the stage. Padding, the toolbar, and the portrait ratio are the limits.
      const maxW = Math.max(0, slot.clientWidth - padX);
      const maxH = Math.max(96, slot.clientHeight - padY - toolbar - gap);
      let width = maxW;
      let height = width / CARD_RATIO;
      if (height > maxH) {
        height = maxH;
        width = height * CARD_RATIO;
      }
      setSize({ width, height });
    };

    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(slot);
    if (toolbarRef.current && mode !== "sheet") observer.observe(toolbarRef.current);
    return () => observer.disconnect();
  }, [mode, slotRef, toolbarRef]);

  return size;
}

export function CallLayout({
  agentImageUrl,
  narrow,
  transcriptOpen,
  portrait,
  toolbar,
  messages,
  composer,
}: {
  agentImageUrl?: string;
  narrow: boolean;
  transcriptOpen: boolean;
  portrait: ReactNode;
  toolbar: ReactNode;
  messages: ReactNode;
  composer: ReactNode;
}) {
  const columnRef = useRef<HTMLDivElement>(null);
  const slotRef = useRef<HTMLDivElement>(null);
  const toolbarRef = useRef<HTMLDivElement>(null);
  const [sheetFraction, setSheetFraction] = useState(0.48);
  const drag = useRef<{ y: number; fraction: number } | null>(null);
  const sheet = narrow && transcriptOpen;
  const mode = sheet ? "sheet" : narrow ? "pinned" : "centered";
  const card = useCardSize(sheet ? slotRef : columnRef, toolbarRef, mode);

  const onPointerDown = (event: PointerEvent<HTMLButtonElement>) => {
    event.currentTarget.setPointerCapture(event.pointerId);
    drag.current = { y: event.clientY, fraction: sheetFraction };
  };

  const onPointerMove = (event: PointerEvent<HTMLButtonElement>) => {
    if (!drag.current || !columnRef.current) return;
    const next = drag.current.fraction - (event.clientY - drag.current.y) / columnRef.current.clientHeight;
    setSheetFraction(clampSheet(next));
  };

  const onPointerUp = () => {
    drag.current = null;
  };

  const nudgeSheet = (delta: number) => setSheetFraction((current) => clampSheet(current + delta));
  const cardStyle = { width: card.width, height: card.height };

  return (
    <div className="flex h-full min-h-0 w-full flex-1">
      <div className="relative flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden">
        <AgentImage src={agentImageUrl} className="ls-glow" />
        <div ref={columnRef} className="relative z-[1] flex min-h-0 flex-1 flex-col">
          {sheet ? (
            <>
              <div
                ref={slotRef}
                className="flex min-h-0 items-center justify-center px-[11px]"
                style={{ flex: `${1 - sheetFraction} 1 0` }}
              >
                <div style={cardStyle}>{portrait}</div>
              </div>
              <div className="flex min-h-0 flex-col px-4" style={{ flex: `${sheetFraction} 1 0` }}>
                <div className="relative flex min-h-0 flex-1 flex-col">
                  <button
                    type="button"
                    className="absolute left-1/2 top-0 z-[1] flex h-4 w-16 -translate-x-1/2 cursor-ns-resize touch-none items-center justify-center"
                    aria-label="Resize transcript"
                    role="separator"
                    aria-orientation="horizontal"
                    aria-valuemin={Math.round(MIN_SHEET * 100)}
                    aria-valuemax={Math.round(MAX_SHEET * 100)}
                    aria-valuenow={Math.round(sheetFraction * 100)}
                    onPointerDown={onPointerDown}
                    onPointerMove={onPointerMove}
                    onPointerUp={onPointerUp}
                    onPointerCancel={onPointerUp}
                    onKeyDown={(event) => {
                      if (event.key === "ArrowUp") nudgeSheet(0.04);
                      if (event.key === "ArrowDown") nudgeSheet(-0.04);
                    }}
                  >
                    <span className="h-2 w-11 rounded-full bg-[var(--ls-handle)]" />
                  </button>
                  {messages}
                </div>
                <div
                  ref={toolbarRef}
                  className="shrink-0 pb-[max(16px,env(safe-area-inset-bottom))] pt-3"
                >
                  {toolbar}
                </div>
              </div>
            </>
          ) : narrow ? (
            <div className="flex min-h-0 flex-1 flex-col px-[11px] pb-7 pt-4">
              <div className="flex min-h-0 flex-1 items-center justify-center">
                <div style={cardStyle}>{portrait}</div>
              </div>
              <div ref={toolbarRef} className="flex shrink-0 justify-center pt-6">
                <div className="flex items-center" style={{ width: card.width, minHeight: TOOLBAR_SLOT }}>
                  {toolbar}
                </div>
              </div>
            </div>
          ) : (
            <div className="flex min-h-0 flex-1 flex-col items-center justify-center gap-6 px-6 py-10">
              <div style={cardStyle}>{portrait}</div>
              <div
                ref={toolbarRef}
                className="flex shrink-0 items-center justify-center"
                style={{ width: card.width, minHeight: TOOLBAR_SLOT }}
              >
                {toolbar}
              </div>
            </div>
          )}
        </div>
      </div>
      {!narrow && transcriptOpen && (
        <aside className="flex h-full w-[444px] shrink-0 flex-col border-l border-[var(--ls-transcript-border)] bg-[var(--ls-transcript-bg)]">
          {messages}
          <div className="shrink-0 px-6 pb-6 pt-6">{composer}</div>
        </aside>
      )}
    </div>
  );
}
