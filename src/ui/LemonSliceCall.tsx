"use client";

import { LiveKitRoom } from "@livekit/components-react";
import { useLemonSliceCall } from "../core/useLemonSliceCall";
import { AvatarStage } from "./AvatarStage";
import { pillButton } from "./buttons";
import { CallPanel } from "./CallPanel";
import { VideoCameraIcon } from "./icons";

const LAYOUT = "flex flex-col items-center gap-4";
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

export type LemonSliceCallProps = {
  startCallUrl: string;
  className?: string;
};

export function LemonSliceCall({ startCallUrl, className }: LemonSliceCallProps) {
  const call = useLemonSliceCall({ startCallUrl });
  const busy = call.status === "connecting";

  const onRoomError = (error: Error) => {
    if (isExpectedDisconnect(error)) return;
    if (isMicPermissionDenied(error)) {
      call.onError(new Error(MIC_BLOCKED_MESSAGE));
      return;
    }
    call.onError(error);
  };

  return (
    <div className={["lemonslice-call", className ?? ""].join(" ")}>
      <div
        className={`${LAYOUT} font-[family-name:var(--ls-font)] text-[rgb(var(--ls-foreground-rgb))]`}
      >
        {call.connection ? (
          <LiveKitRoom
            token={call.connection.token}
            serverUrl={call.connection.serverUrl}
            connect
            audio
            video={false}
            onDisconnected={call.onDisconnected}
            onError={onRoomError}
            className={LAYOUT}
          >
            <CallPanel onAvatarReady={call.markLive} onEnd={call.end} />
          </LiveKitRoom>
        ) : (
          <>
            <AvatarStage compact placeholderText={busy ? "" : "No call"} />
            <button type="button" className={pillButton} disabled={busy} onClick={call.start}>
              <VideoCameraIcon />
              {call.status === "error" ? "Try again" : "Start call"}
            </button>
            {call.errorMessage && (
              <p className="max-w-xs text-center text-sm text-[rgb(var(--ls-destructive-rgb))]">
                {call.errorMessage}
              </p>
            )}
          </>
        )}
      </div>
    </div>
  );
}
