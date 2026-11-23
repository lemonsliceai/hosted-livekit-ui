"use client";

import { RoomAudioRenderer, useRoomContext, useTrackToggle } from "@livekit/components-react";
import { RoomEvent, Track, type Participant, type Room } from "livekit-client";
import { useEffect, useRef, useState, type ReactNode } from "react";
import { useAvatarVideo } from "../core/useAvatarVideo";
import { CallControlsBar } from "./CallControlsBar";
import { CallLayout } from "./CallLayout";
import { Composer } from "./Composer";
import { SuggestionChips, toPill, type Suggestion, type SuggestionPill } from "./SuggestionChips";
import { TranscriptThread } from "./TranscriptThread";
import { AvatarStage } from "./AvatarStage";
import { useIdleCountdown } from "./useIdleCountdown";
import { useTranscript, type TranscriptMessage } from "./useTranscript";

/** Worker → page: busy/idle as an action starts and ends; a done scene clip's new image. */
const AGENT_EVENTS_TOPIC = "agent/events";
/** The JPEG of a scene she just landed on. The data message only names this stream. */
const SCENE_IMAGE_TOPIC = "ls.scene-image";
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
  /**
   * PreCall UI state
   */
  preCall?: {
    /** Drawn on the portrait, such as the start button. */
    overlay?: ReactNode;
    /** Shown in place of the call controls. */
    toolbar?: ReactNode;
    /** Shows "Calling..." on the portrait. */
    calling?: boolean;
    /** Shimmer while the first image loads. */
    pending?: boolean;
  };
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
  preCall,
}: CallPanelProps) {
  const room = useRoomContext();
  const avatarTrack = useAvatarVideo();
  const { toggle: toggleMic, enabled: micEnabled, pending: micPending } = useTrackToggle({
    source: Track.Source.Microphone,
  });
  const transcript = useTranscript(sessionId);
  const idleSeconds = useIdleCountdown(onEnd);
  const caption = useSpokenCaption(transcript.messages, captions && !transcriptOpen);
  const sceneImage = useSceneImage(room, portraitImage, sessionId);
  const actionBusy = useActionBusy(room, sessionId);
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

  const connected = !preCall;
  const ringing = Boolean(preCall?.calling) || (connected && !avatarTrack);
  const pillsNode =
    pills.length > 0 && avatarTrack ? (
      <SuggestionChips
        pills={pills}
        disabled={actionBusy}
        onSelect={(pill) => {
          void select(pill).catch((error: unknown) => {
            console.error("[lemonslice] could not send the message:", error);
          });
        }}
      />
    ) : null;
  const composer = (
    <Composer
      disabled={!connected}
      className="w-full"
      onSend={send}
    />
  );

  return (
    <div className="flex h-full min-h-0 w-full flex-col">
      <CallLayout
        agentImageUrl={agentImageUrl}
        avatarTrack={avatarTrack}
        narrow={narrow}
        transcriptOpen={transcriptOpen}
        onToggleTranscript={onToggleTranscript}
        portrait={
          <AvatarStage
            agentImageUrl={agentImageUrl}
            avatarTrack={avatarTrack}
            calling={false}
            pending={preCall?.pending}
            overlay={preCall?.overlay}
            caption={caption}
            idleSeconds={idleSeconds}
            drift={drift}
            glint={glint}
            edgeFade={edgeFade}
            suggestions={!narrow && !transcriptOpen ? pillsNode : null}
          />
        }
        controls={
          (connected && avatarTrack) || (ringing && narrow) ? (
            <CallControlsBar
              grouped={narrow}
              hangupFirst={narrow}
              micEnabled={micEnabled}
              micDisabled={Boolean(preCall?.calling) || micPending}
              muted={!micEnabled}
              onToggleMic={() => void toggleMic()}
              onHangUp={onEnd}
              transcriptOpen={transcriptOpen}
              transcriptDisabled={Boolean(preCall?.calling)}
              onToggleTranscript={onToggleTranscript}
            />
          ) : null
        }
        dock={
          ringing ? (
            <p className="ls-calling">Calling...</p>
          ) : preCall?.toolbar ? (
            preCall.toolbar
          ) : null
        }
        suggestions={narrow || transcriptOpen ? pillsNode : null}
        messages={
          <TranscriptThread
            messages={transcript.messages}
            fade={narrow && transcriptOpen}
            className={narrow ? "min-h-0 flex-1" : "min-h-0 flex-1 px-6 pb-4 pt-6"}
          />
        }
        composer={composer}
      />
      <RoomAudioRenderer />
    </div>
  );
}

/** Whether an action is in flight on the agent. */
function useActionBusy(room: Room, sessionId: string | null) {
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    setBusy(false);
  }, [sessionId]);

  useEffect(() => {
    const onData = (payload: Uint8Array, _participant: Participant | undefined, _kind: unknown, topic?: string) => {
      if (topic !== AGENT_EVENTS_TOPIC) return;
      let data: { type?: unknown; status?: unknown };
      try {
        data = JSON.parse(new TextDecoder().decode(payload)) as typeof data;
      } catch {
        return;
      }
      if (data.type !== "action") return;
      if (data.status === "busy") setBusy(true);
      else if (data.status === "idle") setBusy(false);
    };
    room.on(RoomEvent.DataReceived, onData);
    return () => {
      room.off(RoomEvent.DataReceived, onData);
    };
  }, [room]);

  return busy;
}

/** The image she is on: the call's first one, then each finished scene clip's end frame. */
function useSceneImage(room: Room, initial: string | undefined, sessionId: string | null) {
  const [image, setImage] = useState(initial);

  useEffect(() => {
    setImage(initial);
  }, [initial, sessionId]);

  useEffect(() => {
    const frames = new Map<string, string>();
    let wanted: string | null = null;
    const show = (id: string) => {
      const url = frames.get(id);
      if (url) setImage(url);
      else wanted = id;
    };
    room.registerByteStreamHandler(SCENE_IMAGE_TOPIC, async (reader) => {
      const bytes = await reader.readAll();
      const merged = new Uint8Array(bytes.reduce((total, chunk) => total + chunk.byteLength, 0));
      let offset = 0;
      for (const chunk of bytes) {
        merged.set(chunk, offset);
        offset += chunk.byteLength;
      }
      const url = URL.createObjectURL(new Blob([merged], { type: reader.info.mimeType || "image/jpeg" }));
      frames.set(reader.info.id, url);
      if (wanted === reader.info.id) setImage(url);
    });
    const onData = (payload: Uint8Array, _participant: Participant | undefined, _kind: unknown, topic?: string) => {
      if (topic !== AGENT_EVENTS_TOPIC) return;
      let data: { type?: unknown; status?: unknown; image?: unknown; image_stream?: unknown };
      try {
        data = JSON.parse(new TextDecoder().decode(payload)) as typeof data;
      } catch {
        return;
      }
      if (data.type !== "scene" || data.status !== "done") return;
      if (typeof data.image === "string") setImage(data.image);
      else if (typeof data.image_stream === "string") show(data.image_stream);
    };
    room.on(RoomEvent.DataReceived, onData);
    return () => {
      room.unregisterByteStreamHandler(SCENE_IMAGE_TOPIC);
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
    if (!text) {
      // The thread was cleared for a new call.
      seen.current = null;
      setCaption(null);
      return;
    }
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
