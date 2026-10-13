"use client";

import { VideoTrack } from "@livekit/components-react";
import type { TrackReference } from "@livekit/components-react";

const RING_BASE =
  "pointer-events-none absolute inset-0 rounded-full border-2 origin-center animate-ring-ripple";

export type AvatarStageProps = {
  compact: boolean;
  ringing?: boolean;
  avatarTrack?: TrackReference | null;
  placeholderText?: string;
};

export function AvatarStage({
  compact,
  ringing = false,
  avatarTrack,
  placeholderText,
}: AvatarStageProps) {
  const frame = (
    <div
      className={[
        "relative flex items-center justify-center overflow-hidden bg-[rgb(var(--ls-muted-rgb))]",
        compact ? "h-[250px] w-[250px] rounded-full" : "aspect-[2/3] w-[320px] rounded-3xl",
        ringing ? "z-[1] origin-center will-change-transform animate-ring-pulse" : "",
      ].join(" ")}
    >
      {avatarTrack ? (
        <VideoTrack trackRef={avatarTrack} className="absolute inset-0 h-full w-full object-cover" />
      ) : (
        placeholderText && (
          <span className="text-sm text-[rgb(var(--ls-muted-foreground-rgb))]">
            {placeholderText}
          </span>
        )
      )}
    </div>
  );

  if (!ringing) return frame;

  return (
    <div className="relative flex h-[250px] w-[250px] items-center justify-center">
      <span aria-hidden className={`${RING_BASE} border-[rgb(var(--ls-foreground-rgb)/0.25)]`} />
      <span
        aria-hidden
        className={`${RING_BASE} border-[rgb(var(--ls-foreground-rgb)/0.15)] [animation-delay:600ms]`}
      />
      {frame}
    </div>
  );
}
