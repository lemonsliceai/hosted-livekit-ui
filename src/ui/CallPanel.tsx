"use client";

import { RoomAudioRenderer, useTrackToggle } from "@livekit/components-react";
import { Track } from "livekit-client";
import { useEffect, useRef, useState } from "react";
import { useAvatarVideo } from "../core/useAvatarVideo";
import { CallControlsBar } from "./CallControlsBar";
import { CallLayout } from "./CallLayout";
import { Composer } from "./Composer";
import { SuggestionChips } from "./SuggestionChips";
import { TranscriptThread } from "./TranscriptThread";
import { AvatarStage } from "./AvatarStage";
import { useIdleCountdown } from "./useIdleCountdown";
import { useTranscript, type TranscriptMessage } from "./useTranscript";

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
  sessionId?: string | null;
  /** Prompts on the video until the visitor sends a message or speaks. */
  suggestions?: readonly string[];
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
  sessionId = null,
  suggestions = [],
}: CallPanelProps) {
  const avatarTrack = useAvatarVideo();
  const { toggle: toggleMic, enabled: micEnabled, pending: micPending } = useTrackToggle({
    source: Track.Source.Microphone,
  });
  const transcript = useTranscript(sessionId);
  const idleSeconds = useIdleCountdown(onEnd);
  const caption = useSpokenCaption(transcript.messages, !transcriptOpen);
  const [suggestionsOpen, setSuggestionsOpen] = useState(true);
  const visitorSpoke = transcript.messages.some((message) => message.role === "user" && message.text.trim());

  useEffect(() => {
    if (visitorSpoke) setSuggestionsOpen(false);
  }, [visitorSpoke]);

  const send = async (text: string) => {
    setSuggestionsOpen(false);
    await transcript.send(text);
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
              suggestionsOpen && avatarTrack ? (
                <SuggestionChips
                  suggestions={suggestions}
                  onSelect={(text) => {
                    void send(text).catch((error: unknown) => {
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
