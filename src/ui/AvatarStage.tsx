"use client";

import { VideoTrack, type TrackReference } from "@livekit/components-react";
import { useEffect, useRef, useState, type CSSProperties, type ReactNode } from "react";
import { useStageEffects } from "./useStageEffects";

/** Keeps the float from revealing the edge of the picture. */
const DRIFT_OVERSCAN: CSSProperties = { transform: "scale(1.03)", transformOrigin: "center" };

export type AvatarStageProps = {
  agentImageUrl?: string;
  avatarTrack?: TrackReference | null;
  calling?: boolean;
  /** Visitor speech, shown on the card while the transcript is closed. */
  caption?: string | null;
  /** Slow float of the portrait. */
  drift?: boolean;
  /** Sparkles in front of the portrait. */
  glint?: boolean;
  /** Dissolves the frame into the backdrop. */
  edgeFade?: boolean;
  /** Control drawn on top of the portrait, such as the pre-call start button. */
  overlay?: ReactNode;
  /** Shimmer in the portrait while the first image is still loading. */
  pending?: boolean;
  /** Seconds left before the call ends. Hidden when null. */
  idleSeconds?: number | null;
};

export function AvatarStage({
  agentImageUrl,
  avatarTrack,
  calling = false,
  caption = null,
  drift = false,
  glint = false,
  edgeFade = false,
  overlay = null,
  idleSeconds = null,
  pending = false,
}: AvatarStageProps) {
  const panelRef = useRef<HTMLDivElement>(null);
  const rigRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  useStageEffects({ drift, glint, panelRef, rigRef, canvasRef });
  const overscan = drift ? DRIFT_OVERSCAN : undefined;

  return (
    <div className="ls-card" data-edge-fade={edgeFade ? "" : undefined}>
      <div ref={panelRef} className="ls-portrait">
        <div ref={rigRef} className="ls-rig">
          <PortraitMedia agentImageUrl={agentImageUrl} avatarTrack={avatarTrack} style={overscan} />
          {!agentImageUrl && pending && <div className="ls-shimmer" aria-hidden />}
          {glint && <canvas ref={canvasRef} className="ls-glint" />}
        </div>
      </div>
      {calling && <p className="ls-calling">Calling...</p>}
      {idleSeconds != null && idleSeconds > 0 && (
        <p className="ls-idle" role="status" aria-live="polite">
          Still there? Ending in {idleSeconds}s
        </p>
      )}
      <SpeechTag text={caption} />
      {overlay}
    </div>
  );
}

function PortraitMedia({
  agentImageUrl,
  avatarTrack,
  style,
}: {
  agentImageUrl?: string;
  avatarTrack?: TrackReference | null;
  style?: CSSProperties;
}) {
  return (
    <>
      <AgentImage src={agentImageUrl} className="ls-fill" style={style} />
      {avatarTrack && <VideoTrack trackRef={avatarTrack} className="ls-fill" style={style} />}
    </>
  );
}

const CAPTION_HIDE_MS = 3000;

function SpeechTag({ text }: { text: string | null }) {
  const [shown, setShown] = useState<string | null>(null);
  const [exiting, setExiting] = useState(false);
  const phase = useRef<"hidden" | "visible" | "exiting">("hidden");

  useEffect(() => {
    if (!text) {
      if (phase.current === "visible") {
        phase.current = "exiting";
        setExiting(true);
      }
      return;
    }
    setShown(text);
    if (phase.current !== "visible") {
      phase.current = "visible";
      setExiting(false);
    }
    const hide = window.setTimeout(() => {
      phase.current = "exiting";
      setExiting(true);
    }, CAPTION_HIDE_MS);
    return () => window.clearTimeout(hide);
  }, [text]);

  if (!shown) return null;

  return (
    <div className="ls-speech" data-exiting={exiting ? "" : undefined}>
      <p
        onAnimationEnd={() => {
          if (phase.current !== "exiting") return;
          phase.current = "hidden";
          setShown(null);
          setExiting(false);
        }}
      >
        {shown}
      </p>
    </div>
  );
}

export function AgentImage({
  src,
  className,
  style,
}: {
  src?: string;
  className?: string;
  style?: CSSProperties;
}) {
  const [hidden, setHidden] = useState(false);

  useEffect(() => {
    setHidden(false);
  }, [src]);

  if (!src || hidden) return null;

  return (
    <img
      src={src}
      alt=""
      draggable={false}
      className={className}
      style={style}
      onError={() => setHidden(true)}
    />
  );
}
