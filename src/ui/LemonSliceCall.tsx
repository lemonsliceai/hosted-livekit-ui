"use client";

import { LiveKitRoom } from "@livekit/components-react";
import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { useLemonSliceCall } from "../core/useLemonSliceCall";
import { AvatarStage } from "./AvatarStage";
import { CallControlsBar } from "./CallControlsBar";
import { CallLayout } from "./CallLayout";
import { CallPanel } from "./CallPanel";
import { Composer } from "./Composer";
import { playHangupSound, useCallingRingTone } from "./callSounds";
import {
  PreCallSetup,
  PreCallStartButton,
  resolveVideoModels,
  VIDEO_MODEL_IDS,
  type LemonSliceVideoModel,
  type LemonSliceVideoModelInput,
} from "./PreCallSetup";
import { TranscriptThread } from "./TranscriptThread";

const NARROW_BELOW = 880;
const MIC_BLOCKED_MESSAGE = "Microphone access was blocked. Allow it for your browser, then try again.";

/** LiveKit rejects in-flight connect and mic publish when the visitor hangs up. */
function isExpectedDisconnect(error: Error) {
  if (error.message === "Cancelled publication by calling unpublish") return true;
  return error.name === "ConnectionError" && "reasonName" in error && error.reasonName === "Cancelled";
}

/** Errors caused by missing mic permissions. */
function isMicPermissionDenied(error: Error) {
  return error.name === "NotAllowedError" || error.name === "PermissionDeniedError";
}

export type LemonSliceCallTheme = "light" | "dark" | "system";

export type LemonSliceCallProps = {
  startCallUrl: string;
  /** Portrait shown before the avatar video arrives, and as the glow behind the stage. */
  agentImageUrl?: string;
  /** Fish Audio voice the server uses for Suggested. When it matches a listed voice, that row is labeled with the voice name. */
  suggestedVoiceId?: string;
  /**
   * Video models offered, in dropdown order. The first is selected by default.
   * Each entry is an id (`"standard"`, `"premium"`) or an object with that id plus
   * an optional `label` and `description`. Defaults to standard then premium.
   * One entry hides the dropdown.
   */
  models?: readonly LemonSliceVideoModelInput[];
  /** `system` follows the visitor's OS appearance. */
  theme?: LemonSliceCallTheme;
  /** Slow float of the portrait. */
  drift?: boolean;
  /** Sparkles in front of the portrait. */
  glint?: boolean;
  /** Dissolves the frame into the backdrop. */
  edgeFade?: boolean;
  /** Called whenever the call ends */
  onEnded?: () => void;
  className?: string;
};

export function LemonSliceCall({
  startCallUrl,
  agentImageUrl,
  suggestedVoiceId,
  models,
  theme = "system",
  drift = false,
  glint = false,
  edgeFade = false,
  onEnded,
  className,
}: LemonSliceCallProps) {
  const call = useLemonSliceCall({ startCallUrl });
  const rootRef = useRef<HTMLDivElement>(null);
  const onEndedRef = useRef(onEnded);
  const [narrow, setNarrow] = useState(false);
  const [transcriptOpen, setTranscriptOpen] = useState(false);
  const [started, setStarted] = useState(false);
  const [voiceId, setVoiceId] = useState("");
  const modelOptions = resolveVideoModels(models);
  const [pickedModel, setVideoModel] = useState<LemonSliceVideoModel | null>(null);
  // A pick that is no longer offered falls back to the first row.
  const videoModel =
    pickedModel && modelOptions.some((option) => option.value === pickedModel)
      ? pickedModel
      : modelOptions[0].value;

  onEndedRef.current = onEnded;

  useEffect(() => {
    if (call.status !== "ended" && call.status !== "error") {
      return;
    }
    setStarted(false);
    onEndedRef.current?.();
  }, [call.status]);

  useLayoutEffect(() => {
    const element = rootRef.current;
    if (!element) return;
    const update = () => setNarrow(element.clientWidth < NARROW_BELOW);
    update();
    const observer = new ResizeObserver(update);
    observer.observe(element);
    return () => observer.disconnect();
  }, []);

  const configuring = !started || call.status === "error";
  const calling = started && (call.status === "idle" || call.status === "connecting");
  const showTranscript = transcriptOpen && (calling || call.connection !== null);
  useCallingRingTone(calling);

  const end = () => {
    setTranscriptOpen(false);
    setStarted(false);
    call.end();
  };

  const hangUp = () => {
    playHangupSound();
    end();
  };

  const onRoomError = (error: Error) => {
    if (isExpectedDisconnect(error)) return;
    if (isMicPermissionDenied(error)) {
      call.onError(new Error(MIC_BLOCKED_MESSAGE));
      return;
    }
    call.onError(error);
  };

  const composer = <Composer disabled className={narrow ? "flex-1" : "w-full"} onSend={() => {}} />;
  const start = () => {
    setStarted(true);
    setTranscriptOpen(false);
    call.start({
      ...(voiceId ? { voiceId } : {}),
      model: VIDEO_MODEL_IDS[videoModel],
    });
  };

  return (
    <div
      ref={rootRef}
      data-theme={theme === "system" ? undefined : theme}
      className={["lemonslice-call", className ?? ""].filter(Boolean).join(" ")}
    >
      {call.connection ? (
        <LiveKitRoom
          token={call.connection.token}
          serverUrl={call.connection.serverUrl}
          connect
          audio
          video={false}
          onDisconnected={end}
          onError={onRoomError}
          className="flex h-full min-h-0 w-full"
        >
          <CallPanel
            agentImageUrl={agentImageUrl}
            narrow={narrow}
            transcriptOpen={transcriptOpen}
            onToggleTranscript={() => setTranscriptOpen((open) => !open)}
            onAvatarReady={call.markLive}
            onEnd={hangUp}
            drift={drift}
            glint={glint}
            edgeFade={edgeFade}
          />
        </LiveKitRoom>
      ) : (
        <CallLayout
          agentImageUrl={agentImageUrl}
          narrow={narrow}
          transcriptOpen={showTranscript}
          portrait={
            <AvatarStage
              agentImageUrl={agentImageUrl}
              calling={calling}
              drift={drift}
              glint={glint}
              edgeFade={edgeFade}
              overlay={
                configuring ? (
                  <PreCallStartButton errorMessage={call.errorMessage} onStart={start} />
                ) : null
              }
            />
          }
          toolbar={
            configuring ? (
              <PreCallSetup
                voiceId={voiceId}
                suggestedVoiceId={suggestedVoiceId}
                model={videoModel}
                modelOptions={modelOptions}
                errorMessage={call.errorMessage}
                onVoiceChange={setVoiceId}
                onModelChange={setVideoModel}
              />
            ) : calling ? (
              <CallControlsBar
                compact={narrow && showTranscript}
                micEnabled={false}
                micDisabled
                muted
                onToggleMic={() => {}}
                onHangUp={hangUp}
                transcriptOpen={transcriptOpen}
                onToggleTranscript={() => setTranscriptOpen((open) => !open)}
                composer={narrow && showTranscript ? composer : undefined}
              />
            ) : null
          }
          messages={
            <TranscriptThread
              messages={[]}
              fade={narrow}
              className={narrow ? "px-1 pb-4 pt-6" : "px-8 pb-6 pt-8"}
            />
          }
          composer={composer}
        />
      )}
    </div>
  );
}
