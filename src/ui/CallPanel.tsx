"use client";

import { RoomAudioRenderer, useRoomContext, useTrackToggle } from "@livekit/components-react";
import { RoomEvent, Track, type Participant, type Room } from "livekit-client";
import { useEffect, useRef, useState } from "react";
import { useAvatarVideo } from "../core/useAvatarVideo";
import { CallControlsBar } from "./CallControlsBar";
import { CallLayout } from "./CallLayout";
import { Composer } from "./Composer";
import { SuggestionChips, toPill, type Suggestion, type SuggestionPill } from "./SuggestionChips";
import { TranscriptThread } from "./TranscriptThread";
import { AvatarStage } from "./AvatarStage";
import { useIdleCountdown } from "./useIdleCountdown";
import { useTranscript, type TranscriptMessage } from "./useTranscript";

/** Worker → page. A scene clip that is done names the image she is on now. */
const AGENT_EVENTS_TOPIC = "agent/events";
/** Page → worker: a scene pill was tapped. Sent just before the pill's text goes as a typed line. */
const SCENE_REQUEST_TOPIC = "ls.scene-request";

export type CallPanelProps = {
  agentImageUrl?: string;
  narrow: boolean;
  transcriptOpen: boolean;
  onToggleTranscript: () => void;
  onAvatarReady: () => void;
  onEnd: () => void;
  drift?: boolean;
  glint?: boolean;
  edgeFade?: boolean;
  /** Show what the visitor is saying on the video while the transcript is closed. */
  captions?: boolean;
  sessionId?: string | null;
  /** Pills on the video. */
  suggestions?: readonly Suggestion[];
  /** The reference image the call started on, so the pill for her current image is hidden. */
  portraitImage?: string;
};

export function CallPanel({
  agentImageUrl,
  narrow,
  transcriptOpen,
  onToggleTranscript,
  onAvatarReady,
  onEnd,
  drift = false,
  glint = false,
  edgeFade = false,
  captions = true,
  sessionId = null,
  suggestions = [],
  portraitImage,
}: CallPanelProps) {
  const room = useRoomContext();
  const avatarTrack = useAvatarVideo();
  const { toggle: toggleMic, enabled: micEnabled, pending: micPending } = useTrackToggle({
    source: Track.Source.Microphone,
  });
  const transcript = useTranscript(sessionId);
  const idleSeconds = useIdleCountdown(onEnd);
  const caption = useSpokenCaption(transcript.messages, captions && !transcriptOpen);
  const sceneImage = useSceneImage(room, portraitImage);
  // A pill with `turns` leaves after that many visitor messages (spoken, typed, or a tapped
  // pill). The pill for the image she is on is hidden.
  const visitorTurns = transcript.messages.filter((message) => message.role === "user" && message.text.trim()).length;
  const pills = suggestions
    .map(toPill)
    .filter((pill) => pill.label.trim())
    .filter((pill) => (pill.turns == null || visitorTurns < pill.turns) && (!pill.image || pill.image !== sceneImage));

  const send = (text: string) => transcript.send(text);
  const select = async (pill: SuggestionPill) => {
    const text = pill.label.trim();
    if (pill.image) {
      // The request first, then the line it announces; both ride the same reliable channel.
      // One action at a time on the agent: tapped during another action, this is answered, not done.
      const request = { type: "scene", text, image: pill.image, ...(pill.prompt ? { prompt: pill.prompt } : {}) };
      await room.localParticipant.publishData(new TextEncoder().encode(JSON.stringify(request)), {
        reliable: true,
        topic: SCENE_REQUEST_TOPIC,
      });
    }
    await send(text);
  };

  useEffect(() => {
    if (avatarTrack) onAvatarReady();
  }, [avatarTrack, onAvatarReady]);

  const composer = (
    <Composer
      className={narrow ? "flex-1" : "w-full"}
      onSend={send}
    />
  );

  return (
    <>
      <CallLayout
        agentImageUrl={agentImageUrl}
        narrow={narrow}
        transcriptOpen={transcriptOpen}
        portrait={
          <AvatarStage
            agentImageUrl={agentImageUrl}
            avatarTrack={avatarTrack}
            calling={!avatarTrack}
            caption={caption}
            idleSeconds={idleSeconds}
            drift={drift}
            glint={glint}
            edgeFade={edgeFade}
            suggestions={
              pills.length > 0 && avatarTrack ? (
                <SuggestionChips
                  pills={pills}
                  onSelect={(pill) => {
                    void select(pill).catch((error: unknown) => {
                      console.error("[lemonslice] could not send the message:", error);
                    });
                  }}
                />
              ) : null
            }
          />
        }
        toolbar={
          <CallControlsBar
            compact={narrow && transcriptOpen}
            micEnabled={micEnabled}
            micDisabled={micPending}
            muted={!micEnabled}
            onToggleMic={() => void toggleMic()}
            onHangUp={onEnd}
            transcriptOpen={transcriptOpen}
            onToggleTranscript={onToggleTranscript}
            composer={narrow && transcriptOpen ? composer : undefined}
          />
        }
        messages={
          <TranscriptThread
            messages={transcript.messages}
            fade={narrow}
            className={narrow ? "px-1 pb-4 pt-6" : "px-8 pb-6 pt-8"}
          />
        }
        composer={composer}
      />
      <RoomAudioRenderer />
    </>
  );
}

/** The image she is on: the call's first one, then each finished scene clip's end frame. */
function useSceneImage(room: Room, initial: string | undefined) {
  const [image, setImage] = useState(initial);

  useEffect(() => {
    setImage(initial);
  }, [initial]);

  useEffect(() => {
    const onData = (payload: Uint8Array, _participant: Participant | undefined, _kind: unknown, topic?: string) => {
      if (topic !== AGENT_EVENTS_TOPIC) return;
      let data: { type?: unknown; status?: unknown; image?: unknown };
      try {
        data = JSON.parse(new TextDecoder().decode(payload)) as typeof data;
      } catch {
        return;
      }
      if (data.type !== "scene" || data.status !== "done" || typeof data.image !== "string") return;
      setImage(data.image);
    };
    room.on(RoomEvent.DataReceived, onData);
    return () => {
      room.off(RoomEvent.DataReceived, onData);
    };
  }, [room]);

  return image;
}

/** Latest thing the visitor said, shown on the card only while the transcript is closed. */
function useSpokenCaption(messages: TranscriptMessage[], enabled: boolean) {
  const spoken = [...messages].reverse().find((message) => message.role === "user" && message.kind === "transcription");
  const text = spoken?.text ?? null;
  const seen = useRef<string | null>(null);
  const [caption, setCaption] = useState<string | null>(null);

  useEffect(() => {
    if (!text) return;
    if (!enabled) {
      seen.current = text;
      setCaption(null);
      return;
    }
    if (seen.current === text) return;
    seen.current = text;
    setCaption(text);
  }, [enabled, text]);

  return caption;
}
