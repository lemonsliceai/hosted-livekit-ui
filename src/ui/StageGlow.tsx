"use client";

import type { TrackReference } from "@livekit/components-react";
import { Track } from "livekit-client";
import { useEffect, useLayoutEffect, useRef, useState, type RefObject } from "react";
import { AgentImage } from "./AvatarStage";

/**
 * Dark wash behind the stage. The picture is painted small, blurred there, and
 * scaled up, so the blur runs on a few thousand pixels instead of the full frame.
 * The still stays until a real video frame is in.
 */
export function StageGlow({
  agentImageUrl,
  avatarTrack,
}: {
  agentImageUrl?: string;
  avatarTrack?: TrackReference | null;
}) {
  const rootRef = useRef<HTMLDivElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const shown = useGlowShown(rootRef);
  const track = avatarTrack?.publication?.track ?? null;
  const videoTrack = track?.kind === Track.Kind.Video ? track : null;
  const trackKey = videoTrack ? (avatarTrack?.publication?.trackSid ?? "live") : null;
  const [liveKey, setLiveKey] = useState<string | null>(null);

  useEffect(() => {
    const el = videoRef.current;
    if (!shown || !el || !videoTrack || !trackKey) return;
    let cancelled = false;
    videoTrack.attach(el);
    const show = () => {
      if (!cancelled) setLiveKey(trackKey);
    };
    const watch = () => {
      if (typeof el.requestVideoFrameCallback === "function") {
        el.requestVideoFrameCallback(() => show());
        return;
      }
      show();
    };
    el.addEventListener("loadeddata", watch);
    el.addEventListener("playing", watch);
    if (el.readyState >= HTMLMediaElement.HAVE_CURRENT_DATA) watch();
    return () => {
      cancelled = true;
      el.removeEventListener("loadeddata", watch);
      el.removeEventListener("playing", watch);
      videoTrack.detach(el);
      setLiveKey((current) => (current === trackKey ? null : current));
    };
  }, [shown, trackKey, videoTrack]);

  return (
    <div ref={rootRef} className="ls-glow" aria-hidden>
      <div className="ls-glow-source">
        <AgentImage src={agentImageUrl} className="ls-glow-media" />
        {shown && videoTrack ? (
          <video
            ref={videoRef}
            muted
            playsInline
            className="ls-glow-media"
            data-live={liveKey != null && liveKey === trackKey ? "" : undefined}
          />
        ) : null}
      </div>
    </div>
  );
}

/** The glow is display:none in light mode. Follow that, so a light call never attaches a second video. */
function useGlowShown(ref: RefObject<HTMLElement | null>) {
  const [shown, setShown] = useState(false);

  useLayoutEffect(() => {
    const el = ref.current;
    if (!el) return;
    const query = window.matchMedia("(prefers-color-scheme: dark)");
    const apply = () => setShown(getComputedStyle(el).display !== "none");
    apply();
    query.addEventListener("change", apply);
    const root = el.closest(".lemonslice-call");
    const observer = new MutationObserver(apply);
    if (root) observer.observe(root, { attributes: true, attributeFilter: ["data-theme"] });
    return () => {
      query.removeEventListener("change", apply);
      observer.disconnect();
    };
  }, [ref]);

  return shown;
}
