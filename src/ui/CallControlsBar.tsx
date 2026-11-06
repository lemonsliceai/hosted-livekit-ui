"use client";

import type { ReactNode } from "react";
import {
  controlButton,
  controlButtonOn,
  controlSize,
  controlSizeCompact,
  hangupButton,
  hangupSize,
  hangupSizeCompact,
} from "./buttons";
import { ChatIcon, MicrophoneIcon, MicrophoneSlashIcon, PhoneIcon } from "./icons";

export type CallControlsBarProps = {
  micEnabled: boolean;
  micDisabled?: boolean;
  muted?: boolean;
  onToggleMic: () => void;
  onHangUp: () => void;
  transcriptOpen: boolean;
  onToggleTranscript: () => void;
  /** 44px circles with an inline composer, used in the narrow transcript sheet. */
  compact?: boolean;
  composer?: ReactNode;
};

export function CallControlsBar({
  micEnabled,
  micDisabled = false,
  muted = false,
  onToggleMic,
  onHangUp,
  transcriptOpen,
  onToggleTranscript,
  compact = false,
  composer,
}: CallControlsBarProps) {
  const size = compact ? controlSizeCompact : controlSize;

  return (
    <div
      className={
        compact
          ? "flex w-full min-w-0 items-center gap-2"
          : "flex w-full items-start justify-center gap-3"
      }
    >
      <button
        type="button"
        className={`${controlButton} ${size} ${micEnabled ? controlButtonOn : ""}`}
        disabled={micDisabled}
        onClick={onToggleMic}
        aria-pressed={micEnabled}
        aria-label={muted ? "Unmute" : "Mute"}
        title={muted ? "Unmute" : "Mute"}
      >
        {muted || !micEnabled ? <MicrophoneSlashIcon /> : <MicrophoneIcon />}
      </button>
      <button
        type="button"
        className={`${controlButton} ${size} ${transcriptOpen ? controlButtonOn : ""}`}
        onClick={onToggleTranscript}
        aria-pressed={transcriptOpen}
        aria-label={transcriptOpen ? "Hide transcript" : "Show transcript"}
        title={transcriptOpen ? "Hide transcript" : "Show transcript"}
      >
        <ChatIcon />
      </button>
      {composer}
      <button
        type="button"
        className={`${hangupButton} ${compact ? hangupSizeCompact : hangupSize}`}
        onClick={onHangUp}
        aria-label="Hang up"
        title="Hang up"
      >
        <PhoneIcon className="rotate-[135deg]" />
      </button>
    </div>
  );
}
