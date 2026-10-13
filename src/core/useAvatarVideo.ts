// Avoid editing

"use client";

import {
  useRoomContext,
  useTracks,
  type TrackReference,
} from "@livekit/components-react";
import { Track } from "livekit-client";

/** The avatar's camera track, or null until the avatar has joined and published. */
export function useAvatarVideo(): TrackReference | null {
  const room = useRoomContext();
  const tracks = useTracks([Track.Source.Camera]);

  const avatarTrack = tracks.find(
    (entry) =>
      entry.participant?.identity !== room?.localParticipant?.identity &&
      entry.publication?.track != null,
  );

  return (avatarTrack as TrackReference | undefined) ?? null;
}
