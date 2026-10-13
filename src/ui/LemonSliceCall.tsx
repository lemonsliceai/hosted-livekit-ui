"use client";

import { LiveKitRoom } from "@livekit/components-react";
import { useLemonSliceCall } from "../core/useLemonSliceCall";
import { AvatarStage } from "./AvatarStage";
import { pillButton } from "./buttons";
import { CallPanel } from "./CallPanel";
import { VideoCameraIcon } from "./icons";

const LAYOUT = "flex flex-col items-center gap-4";

export type LemonSliceCallProps = {
  startCallUrl: string;
  className?: string;
};

export function LemonSliceCall({ startCallUrl, className }: LemonSliceCallProps) {
  const call = useLemonSliceCall({ startCallUrl });
  const busy = call.status === "connecting";

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
            onError={call.onError}
            className={LAYOUT}
          >
            <CallPanel onAvatarReady={call.markLive} onEnd={call.end} />
          </LiveKitRoom>
        ) : (
          <>
            <AvatarStage compact placeholderText={busy ? "" : "No call"} />
            <button type="button" className={pillButton} disabled={busy} onClick={call.start}>
              <VideoCameraIcon />
              Start call
            </button>
          </>
        )}
      </div>
    </div>
  );
}
