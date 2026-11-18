"use client";

import { LiveKitRoom } from "@livekit/components-react";
import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { useLemonSliceCall } from "../core/useLemonSliceCall";
import { CallControlsBar } from "./CallControlsBar";
import { CallPanel } from "./CallPanel";
import { Composer } from "./Composer";
import type { Suggestion } from "./SuggestionChips";
import { playHangupSound, useCallingRingTone } from "./callSounds";
import { PreCallSetup, PreCallStartButton } from "./PreCallSetup";
import {
  resolveVideoModels,
  VIDEO_MODELS,
  type LemonSliceVideoModel,
  type LemonSliceVideoModelInput,
} from "./videoModels";
import { cropForModel, cropsForModels, fetchCrops, type CropResult } from "./avatarVariant";
import { PrepDotMatrix } from "./PrepDotMatrix";
import { PreparingNotice } from "./PreparingNotice";
import { fetchSuggestedVoice } from "./voiceMatch";

const NARROW_BELOW = 880;
const MIC_BLOCKED_MESSAGE = "Microphone access was blocked. Allow it for your browser, then try again.";
const NO_FACE_MESSAGE = "We could not find a face in your image. Provide an image with a face for best quality.";
const PREPARE_FAILED_MESSAGE = "Could not prepare the avatar";

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
  /** Fish Audio voice for Suggested. Sent with the call, so it overrides the room's `voiceId`. */
  voiceId?: string;
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
  /** Shows what the visitor is saying on the video while the transcript is closed. On by default. */
  captions?: boolean;
  /**
   * Pills on the video once it is live. Roleplay only; omit for none. A string, or
   * `{ label, chatMessage?, turns?, image?, roleplayPrompt? }`: `chatMessage` is sent in place
   * of the label, `turns` hides the pill after that many visitor messages (omit to keep it),
   * `image` makes it a scene change that ends on that image.
   */
  suggestions?: readonly Suggestion[];
  /** Called whenever the call ends */
  onEnded?: () => void;
  /**
   * Crops prepare in the background through `/api/lemonslice/avatar-variant`. A base model uses
   * the portrait crop and roleplay uses the bust crop. Every offered model's crop is looked up,
   * and only the selected one is generated. The preparing screen shows after
   * Start, and only when that crop is not ready yet. Set false to skip crop prep.
   */
  avatarVariants?: boolean;
  className?: string;
};

export function LemonSliceCall({
  startCallUrl,
  agentImageUrl,
  voiceId,
  models,
  theme = "system",
  drift = false,
  glint = false,
  edgeFade = false,
  captions = true,
  suggestions = [],
  onEnded,
  avatarVariants = true,
  className,
}: LemonSliceCallProps) {
  const variantsOn = Boolean(avatarVariants && agentImageUrl);
  const call = useLemonSliceCall({ startCallUrl });
  const rootRef = useRef<HTMLDivElement>(null);
  const onEndedRef = useRef(onEnded);
  const [narrow, setNarrow] = useState(false);
  const [transcriptOpen, setTranscriptOpen] = useState(true);
  const [started, setStarted] = useState(false);
  const [startRequested, setStartRequested] = useState(false);
  const [pickedVoiceId, setPickedVoiceId] = useState("");
  const [prepareAttempt, setPrepareAttempt] = useState(0);
  const [prepareError, setPrepareError] = useState<string | null>(null);
  const modelOptions = resolveVideoModels(models);
  const [pickedModel, setVideoModel] = useState<LemonSliceVideoModel | null>(null);
  // A pick that is no longer offered falls back to the first row.
  const modelOption = modelOptions.find((option) => option.value === pickedModel) ?? modelOptions[0];
  const videoModel = modelOption.value;

  const modelIds = modelOptions.map((option) => option.value);
  const crop = cropForModel(videoModel);
  // Crops found or made for this photo. undefined until the first lookup answers.
  const [crops, setCrops] = useState<Record<string, string> | undefined>(undefined);
  const [faceDetected, setFaceDetected] = useState<boolean | undefined>(undefined);
  const [variantImage, setVariantImage] = useState(agentImageUrl);
  // Crops belong to one photo. Drop them in this render when the photo changes, before paint.
  if (variantImage !== agentImageUrl) {
    setVariantImage(agentImageUrl);
    setCrops(undefined);
    setFaceDetected(undefined);
    setPrepareError(null);
  }
  onEndedRef.current = onEnded;

  // The photo on screen, set after commit. Results for any other photo are dropped.
  const imageRef = useRef(agentImageUrl);
  useLayoutEffect(() => {
    imageRef.current = agentImageUrl;
  }, [agentImageUrl]);

  const keepCrops = (image: string, result: CropResult) => {
    if (imageRef.current !== image) return;
    setCrops((current) => ({ ...current, ...result.images }));
    // One "no face" answer is enough to warn.
    if (result.faceDetected !== undefined) setFaceDetected((current) => (current === false ? false : result.faceDetected));
  };

  // Look up every offered model's crop in one call. Lookups are cheap, and switching
  // models then shows a cached crop straight away.
  useEffect(() => {
    if (!variantsOn || !agentImageUrl) return;
    const controller = new AbortController();
    const image = agentImageUrl;
    fetchCrops(image, cropsForModels(modelIds), false, controller.signal)
      .then((result) => keepCrops(image, result))
      .catch((error: unknown) => {
        if (controller.signal.aborted || imageRef.current !== image) return;
        setCrops((current) => current ?? {});
        setPrepareError(error instanceof Error ? error.message : PREPARE_FAILED_MESSAGE);
      });
    return () => controller.abort();
  }, [variantsOn, agentImageUrl, modelIds.join(",")]);

  // Generate only the selected model's crop, once the lookup has said it is missing. A model
  // switch doesn't cancel a generation, so switching back waits for it instead of asking again.
  const lookedUp = crops !== undefined;
  const preparedImage = crops?.[crop];
  const generating = useRef<{ image?: string; crops: Set<string> }>({ crops: new Set() });
  useEffect(() => {
    if (!variantsOn || !agentImageUrl || !lookedUp || preparedImage) return;
    if (generating.current.image !== agentImageUrl) generating.current = { image: agentImageUrl, crops: new Set() };
    const inFlight = generating.current.crops;
    if (inFlight.has(crop)) return;
    inFlight.add(crop);
    const image = agentImageUrl;
    setPrepareError(null);
    fetchCrops(image, [crop], true)
      .then((result) => {
        if (imageRef.current !== image) return;
        keepCrops(image, result);
        if (!result.images[crop]) setPrepareError(PREPARE_FAILED_MESSAGE);
      })
      .catch((error: unknown) => {
        if (imageRef.current !== image) return;
        setPrepareError(error instanceof Error ? error.message : PREPARE_FAILED_MESSAGE);
      })
      .finally(() => inFlight.delete(crop));
  }, [variantsOn, agentImageUrl, lookedUp, crop, prepareAttempt]);

  // Suggested's voice, asked once the crop is known so a new image is matched on it.
  const voiceKey = `${agentImageUrl ?? ""}|${variantsOn}|${startCallUrl}`;
  const [voice, setVoice] = useState<{ key: string; id: string | null }>();
  const serverVoice = voice?.key === voiceKey ? voice.id : undefined;
  const fixedVoice = voiceId?.trim() || undefined;
  const suggestedVoice = fixedVoice ?? serverVoice;
  const firstCrop = preparedImage ?? (crops ? Object.values(crops)[0] : undefined);
  const voiceImage = variantsOn ? (firstCrop ?? (prepareError ? agentImageUrl : undefined)) : agentImageUrl;
  const canAskVoice = !variantsOn || Boolean(voiceImage);
  useEffect(() => {
    if (fixedVoice || !canAskVoice) return;
    let cancelled = false;
    fetchSuggestedVoice(startCallUrl, voiceImage)
      .catch(() => null)
      .then((id) => {
        if (!cancelled) setVoice({ key: voiceKey, id });
      });
    return () => {
      cancelled = true;
    };
  }, [voiceKey, voiceImage, canAskVoice, fixedVoice]);

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

  // Hold the original photo until the lookup answers, so a cached crop never swaps in after it.
  const imagePending = variantsOn && crops === undefined;
  const previewImage = preparedImage ?? (imagePending ? undefined : agentImageUrl);
  const voicePending = pickedVoiceId === "" && suggestedVoice === undefined;
  const cropReady = !variantsOn || Boolean(preparedImage);
  const preparing = startRequested && ((!cropReady && !prepareError) || (voicePending && !(variantsOn && prepareError)));
  const composer = <Composer disabled className={narrow ? "flex-1" : "w-full"} onSend={() => {}} />;
  const sentVoiceId = pickedVoiceId || fixedVoice;
  const beginCall = (imageUrl: string | undefined) => {
    setStartRequested(false);
    setStarted(true);
    setTranscriptOpen(modelOption.transcriptOpen);
    call.start({
      ...(sentVoiceId ? { voiceId: sentVoiceId } : {}),
      model: VIDEO_MODELS[videoModel].id,
      ...(imageUrl ? { agentImageUrl: imageUrl } : {}),
    });
  };
  const start = () => {
    if (cropReady && !voicePending) {
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
    if (!cropReady || voicePending || launchedRef.current) return;
    launchedRef.current = true;
    beginCall(preparedImage);
  }, [startRequested, cropReady, voicePending]);

  return (
    <div
      ref={rootRef}
      data-theme={theme === "system" ? undefined : theme}
      className={["lemonslice-call", className ?? ""].filter(Boolean).join(" ")}
    >
      <LiveKitRoom
        token={call.connection?.token}
        serverUrl={call.connection?.serverUrl}
        connect={call.connection !== null}
        audio
        video={false}
        onDisconnected={() => {
          if (call.connection) end();
        }}
        onError={onRoomError}
        className="flex h-full min-h-0 w-full"
      >
        <CallPanel
          agentImageUrl={previewImage}
          narrow={narrow}
          transcriptOpen={showTranscript}
          onToggleTranscript={() => setTranscriptOpen((open) => !open)}
          onAvatarReady={call.markLive}
          onEnd={hangUp}
          drift={drift}
          glint={glint}
          edgeFade={edgeFade}
          captions={captions}
          sessionId={call.connection?.sessionId ?? null}
          suggestions={VIDEO_MODELS[videoModel].suggestions && Array.isArray(suggestions) ? suggestions : []}
          portraitImage={agentImageUrl}
          preCall={
            call.connection
              ? undefined
              : {
                  calling,
                  pending: imagePending,
                  overlay: configuring ? (
                    preparing ? (
                      <div className="ls-preparing" role="status">
                        {previewImage ? <img src={previewImage} alt="" className="ls-preparing-photo" /> : null}
                        <div className="ls-preparing-veil" aria-hidden />
                        <PrepDotMatrix />
                        <PreparingNotice />
                      </div>
                    ) : startRequested && prepareError ? (
                      <button type="button" className="ls-precall-start" onClick={() => setPrepareAttempt((attempt) => attempt + 1)}>
                        Try again
                      </button>
                    ) : (
                      <PreCallStartButton errorMessage={call.errorMessage} onStart={start} />
                    )
                  ) : null,
                  toolbar: configuring ? (
                    <PreCallSetup
                      voiceId={pickedVoiceId}
                      suggestedVoiceId={suggestedVoice ?? undefined}
                      model={videoModel}
                      modelOptions={modelOptions}
                      errorMessage={(startRequested ? prepareError : null) ?? call.errorMessage}
                      warningMessage={faceDetected === false ? NO_FACE_MESSAGE : null}
                      onVoiceChange={setPickedVoiceId}
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
                  ) : null,
                }
          }
        />
      </LiveKitRoom>
    </div>
  );
}
