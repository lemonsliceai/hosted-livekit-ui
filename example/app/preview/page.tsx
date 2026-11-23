"use client";

import { useState } from "react";
import { AGENT_IMAGE_URL, SUGGESTIONS } from "../../call-config";
import { AvatarStage } from "../../../src/ui/AvatarStage";
import { CallControlsBar } from "../../../src/ui/CallControlsBar";
import { CallLayout } from "../../../src/ui/CallLayout";
import { Composer } from "../../../src/ui/Composer";
import { SuggestionChips, toPill } from "../../../src/ui/SuggestionChips";
import { TranscriptThread } from "../../../src/ui/TranscriptThread";
import type { TranscriptMessage } from "../../../src/ui/useTranscript";

const SEED: TranscriptMessage[] = [
  { id: "a", role: "agent", text: "Hey. I was just thinking about you.", final: true, kind: "chat" },
  { id: "b", role: "user", text: "Yeah? What about?", final: true, kind: "chat" },
];

/** A live sheet with no LiveKit room, so the keyboard can be checked on a phone. */
export default function SheetPreview() {
  const [open, setOpen] = useState(false);
  const [micEnabled, setMicEnabled] = useState(true);
  const [messages, setMessages] = useState(SEED);
  const say = (text: string) => {
    setMessages((current) => [...current, { id: crypto.randomUUID(), role: "user", text, final: true, kind: "chat" }]);
  };

  return (
    <main className="page">
      <div className="lemonslice-call" data-theme="dark">
        <CallLayout
          narrow
          agentImageUrl={AGENT_IMAGE_URL}
          transcriptOpen={open}
          onToggleTranscript={() => setOpen((value) => !value)}
          portrait={<AvatarStage agentImageUrl={AGENT_IMAGE_URL} />}
          controls={
            <CallControlsBar
              grouped
              hangupFirst
              micEnabled={micEnabled}
              muted={!micEnabled}
              onToggleMic={() => setMicEnabled((enabled) => !enabled)}
              onHangUp={() => undefined}
              transcriptOpen={open}
              onToggleTranscript={() => setOpen((value) => !value)}
            />
          }
          suggestions={<SuggestionChips pills={SUGGESTIONS.map(toPill)} onSelect={(pill) => say(pill.label)} />}
          messages={<TranscriptThread messages={messages} fade={open} className="min-h-0 flex-1" />}
          composer={<Composer onSend={say} />}
        />
      </div>
    </main>
  );
}
