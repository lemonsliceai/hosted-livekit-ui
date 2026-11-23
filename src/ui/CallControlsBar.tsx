"use client";

import { controlButton, controlButtonOn, hangupButton } from "./buttons";
import { ChatIcon, MicrophoneIcon, MicrophoneSlashIcon, PhoneIcon } from "./icons";

export type CallControlsBarProps = {
  micEnabled: boolean;
  micDisabled?: boolean;
  muted?: boolean;
  onToggleMic: () => void;
  onHangUp: () => void;
  transcriptOpen: boolean;
  onToggleTranscript: () => void;
  /** Nothing to show yet, so the transcript button stays quiet. */
  transcriptDisabled?: boolean;
  /** 44px circles in one glass stack. Desktop uses separate 48px circles. */
  grouped?: boolean;
  /** Hang up sits on top. The desktop stack keeps it at the bottom. */
  hangupFirst?: boolean;
};

export function CallControlsBar({
  micEnabled,
  micDisabled = false,
  muted = false,
  onToggleMic,
  onHangUp,
  transcriptOpen,
  onToggleTranscript,
  transcriptDisabled = false,
  grouped = false,
  hangupFirst = false,
}: CallControlsBarProps) {
  const size = grouped ? "size-11" : "size-12";
  const hangup = (
    <button
      type="button"
      className={`${hangupButton} ${size}`}
      onClick={onHangUp}
      aria-label="Hang up"
      title="Hang up"
    >
      <PhoneIcon className="rotate-[135deg]" />
    </button>
  );
  const mic = (
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
  );
  const transcript = (
    <button
      type="button"
      className={`${controlButton} ${size} ${transcriptOpen ? controlButtonOn : ""}`}
      disabled={transcriptDisabled}
      onClick={onToggleTranscript}
      aria-pressed={transcriptOpen}
      aria-label={transcriptOpen ? "Hide transcript" : "Show transcript"}
      title={transcriptOpen ? "Hide transcript" : "Show transcript"}
    >
      <ChatIcon />
    </button>
  );

  return (
    <div className="ls-controls" data-grouped={grouped ? "" : undefined}>
      {hangupFirst ? hangup : null}
      {mic}
      {transcript}
      {hangupFirst ? null : hangup}
    </div>
  );
}
