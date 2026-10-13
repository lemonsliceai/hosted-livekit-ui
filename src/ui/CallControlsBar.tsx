"use client";

import { iconButton } from "./buttons";
import { MicrophoneIcon, MicrophoneSlashIcon, PhoneIcon } from "./icons";

export type CallControlsBarProps = {
  micEnabled: boolean;
  micPending: boolean;
  onToggleMic: () => void;
  onHangUp: () => void;
};

export function CallControlsBar({
  micEnabled,
  micPending,
  onToggleMic,
  onHangUp,
}: CallControlsBarProps) {
  return (
    <div className="flex shrink-0 self-stretch mx-auto w-[min(100%,600px)] min-w-0 px-3">
      <div className="flex w-full min-w-0 items-center gap-2">
        <div className="flex flex-shrink-0 items-center gap-2">
          <button
            type="button"
            className={micEnabled ? iconButton.solid : iconButton.outline}
            disabled={micPending}
            onClick={onToggleMic}
            title={micEnabled ? "Mute" : "Unmute"}
            aria-label={micEnabled ? "Mute" : "Unmute"}
          >
            {micEnabled ? (
              <MicrophoneIcon className="w-5 h-5" />
            ) : (
              <MicrophoneSlashIcon className="w-5 h-5 text-red-500" />
            )}
          </button>
        </div>

        <div className="w-0 min-w-0 flex-1" />

        <button
          type="button"
          className={iconButton.destructive}
          onClick={onHangUp}
          title="Hang up"
          aria-label="Hang up"
        >
          <PhoneIcon className="w-5 h-5 rotate-[135deg] translate-y-0.5" />
        </button>
      </div>
    </div>
  );
}
