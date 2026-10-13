"use client";

import { useEffect } from "react";
import { RoomAudioRenderer, useTrackToggle } from "@livekit/components-react";
import { Track } from "livekit-client";
import { useAvatarVideo } from "../core/useAvatarVideo";
import { AvatarStage } from "./AvatarStage";
import { pillButton } from "./buttons";
import { CallControlsBar } from "./CallControlsBar";

export type CallPanelProps = {
  onAvatarReady: () => void;
  onEnd: () => void;
};

export function CallPanel({ onAvatarReady, onEnd }: CallPanelProps) {
  const avatarTrack = useAvatarVideo();
  const { toggle: toggleMic, enabled: micEnabled, pending: micPending } = useTrackToggle({
    source: Track.Source.Microphone,
  });

  useEffect(() => {
    if (avatarTrack) onAvatarReady();
  }, [avatarTrack, onAvatarReady]);

  const connecting = !avatarTrack;

  return (
    <>
      <AvatarStage compact={connecting} ringing={connecting} avatarTrack={avatarTrack} />

      {connecting ? (
        <button type="button" className={pillButton} disabled>
          Calling…
        </button>
      ) : (
        <CallControlsBar
          micEnabled={micEnabled}
          micPending={micPending}
          onToggleMic={() => void toggleMic()}
          onHangUp={onEnd}
        />
      )}

      {/* Plays the avatar's audio. */}
      <RoomAudioRenderer />
    </>
  );
}
