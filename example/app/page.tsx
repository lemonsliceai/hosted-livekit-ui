"use client";

import { LemonSliceCall } from "@lemonslice/hosted-call";
import { useState } from "react";
import { AGENT_IMAGE_URL, SUGGESTIONS, VOICE_ID } from "../call-config";

export default function Home() {
  const [open, setOpen] = useState(false);

  return (
    <main className="page">
      {open ? (
        <>
          <LemonSliceCall
            startCallUrl="/api/lemonslice/start-call"
            agentImageUrl={AGENT_IMAGE_URL}
            suggestedVoiceId={VOICE_ID}
            // Dropdown order; the first row is selected by default. The ids stay
            // "premium" and "standard"; the ui displays them as FaceTime and
            // FaceTime Lite.  Roleplay has to be listed here to be shown as an option.
            // For a subtitle, use { model: "roleplay", description: "..." } instead.
            models={["roleplay", "premium", "standard"]}
            theme="dark"
            // The visitor's words are not shown on the video.
            captions={false}
            // UI effects.
            // drift: subtle movement of the video frame.
            // drift={true}
            // glint: subtle shimmer on the video.
            // glint={true}
            // edgeFade: subtle fade at the edges of the video frame.
            // edgeFade={true}
            // Pills on the video, set in call-config.ts.
            suggestions={SUGGESTIONS}
          />
          <button type="button" className="close" onClick={() => setOpen(false)} aria-label="Close">
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16" width="20" height="20" aria-hidden>
              <path
                fill="currentColor"
                fillRule="evenodd"
                d="M5.28 4.22a.75.75 0 0 0-1.06 1.06L6.94 8l-2.72 2.72a.75.75 0 1 0 1.06 1.06L8 9.06l2.72 2.72a.75.75 0 1 0 1.06-1.06L9.06 8l2.72-2.72a.75.75 0 0 0-1.06-1.06L8 6.94 5.28 4.22Z"
              />
            </svg>
          </button>
        </>
      ) : (
        <button type="button" className="launch" onClick={() => setOpen(true)}>
          Video call
        </button>
      )}
    </main>
  );
}
