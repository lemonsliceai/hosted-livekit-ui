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
import { cachedAvatarVariants, loadAvatarVariants } from "./avatarVariant";

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
  /**
   * Crops prepare in the background through `/api/lemonslice/avatar-variant`. A base model uses
   * the portrait crop and roleplay uses the bust crop. The preparing pill shows after
   * Start, and only when that crop is not ready yet. Set false to skip crop prep.
   */
  avatarVariants?: boolean;
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
  avatarVariants = true,
  className,
}: LemonSliceCallProps) {
  const variantsOn = Boolean(avatarVariants && agentImageUrl);
  const call = useLemonSliceCall({ startCallUrl });
  const rootRef = useRef<HTMLDivElement>(null);
  const onEndedRef = useRef(onEnded);
  const [narrow, setNarrow] = useState(false);
  const [transcriptOpen, setTranscriptOpen] = useState(false);
  const [started, setStarted] = useState(false);
  const [startRequested, setStartRequested] = useState(false);
  const [voiceId, setVoiceId] = useState("");
  const [prepareAttempt, setPrepareAttempt] = useState(0);
  const [prepareError, setPrepareError] = useState<string | null>(null);
  const modelOptions = resolveVideoModels(models);
  const [pickedModel, setVideoModel] = useState<LemonSliceVideoModel | null>(null);
  // A pick that is no longer offered falls back to the first row.
  const videoModel =
    pickedModel && modelOptions.some((option) => option.value === pickedModel)
      ? pickedModel
      : modelOptions[0].value;

  const modelIds = modelOptions.map((option) => option.value);
  const cached = variantsOn && agentImageUrl ? cachedAvatarVariants(agentImageUrl, modelIds) : undefined;
  // undefined = lookup still running. An empty object = lookup finished with nothing cached.
  const [variants, setVariants] = useState<Record<string, string> | undefined>(cached);
  const [variantImage, setVariantImage] = useState(agentImageUrl);
  // Crops belong to one photo. Drop them in this render when the photo changes, before paint.
  if (variantImage !== agentImageUrl) {
    setVariantImage(agentImageUrl);
    setVariants(cached);
    setPrepareError(null);
  }
  onEndedRef.current = onEnded;

  useEffect(() => {
    if (!variantsOn || !agentImageUrl || cached) return;
    let cancelled = false;
    loadAvatarVariants(agentImageUrl, modelIds, (found) => {
      if (!cancelled) setVariants(found);
    })
      .then((images) => {
        if (!cancelled) setVariants(images);
      })
      .catch((error: unknown) => {
        if (cancelled) return;
        setVariants((current) => current ?? {});
        setPrepareError(error instanceof Error ? error.message : "Could not prepare the avatar");
      });
    return () => {
      cancelled = true;
    };
  }, [variantsOn, agentImageUrl, modelIds.join(","), prepareAttempt]);

  useEffect(() => {
    if (call.status !== "ended" && call.status !== "error") {
      return;
    }
    setStarted(false);
    setStartRequested(false);
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
    setStartRequested(false);
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

  const preparedImage = variants?.[videoModel === "roleplay" ? "bust" : "portrait"];
  // Hold the original photo until the lookup answers, so a cached crop never swaps in after it.
  const imagePending = variantsOn && variants === undefined;
  const previewImage = preparedImage ?? (imagePending ? undefined : agentImageUrl);
  const preparing = startRequested && !preparedImage && !prepareError;
  const composer = <Composer disabled className={narrow ? "flex-1" : "w-full"} onSend={() => {}} />;
  const beginCall = (imageUrl: string | undefined) => {
    setStartRequested(false);
    setStarted(true);
    setTranscriptOpen(false);
    call.start({
      ...(voiceId ? { voiceId } : {}),
      model: VIDEO_MODEL_IDS[videoModel],
      ...(imageUrl ? { agentImageUrl: imageUrl } : {}),
    });
  };
  const start = () => {
    if (!variantsOn || preparedImage) {
      beginCall(preparedImage);
      return;
    }
    setStartRequested(true);
    if (prepareError) setPrepareAttempt((attempt) => attempt + 1);
  };

  const launchedRef = useRef(false);
  useEffect(() => {
    if (!startRequested) {
      launchedRef.current = false;
      return;
    }
    if (!preparedImage || launchedRef.current) return;
    launchedRef.current = true;
    beginCall(preparedImage);
  }, [startRequested, preparedImage]);

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
            agentImageUrl={previewImage}
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
          agentImageUrl={previewImage}
          narrow={narrow}
          transcriptOpen={showTranscript}
          portrait={
            <AvatarStage
              agentImageUrl={previewImage}
              calling={calling}
              drift={drift}
              glint={glint}
              edgeFade={edgeFade}
              pending={imagePending}
              overlay={
                configuring ? (
                  preparing ? (
                    <div className="ls-preparing" role="status">
                      <span className="ls-preparing-fill" />
                      <span className="ls-preparing-label">Preparing avatar</span>
                    </div>
                  ) : startRequested && prepareError ? (
                    <button type="button" className="ls-precall-start" onClick={() => setPrepareAttempt((attempt) => attempt + 1)}>
                      Try again
                    </button>
                  ) : (
                    <PreCallStartButton errorMessage={call.errorMessage} onStart={start} />
                  )
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
                errorMessage={(startRequested ? prepareError : null) ?? call.errorMessage}
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
