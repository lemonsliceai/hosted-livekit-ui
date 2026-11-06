"use client";

import { LemonSliceCall } from "@lemonslice/hosted-call";
import { useState } from "react";
import { AGENT_IMAGE_URL, VOICE_ID } from "../agent";

export default function Home() {
  const [open, setOpen] = useState(false);

  return (
    <main className="page">
      {open ? (
        <>
          <LemonSliceCall
            startCallUrl="/api/lemonslice/start-call"
            agentImageUrl={AGENT_IMAGE_URL}
            suggestedVoiceId="0984f8581bbb4e5e980a990abb865874"
            // Dropdown order; the first row is selected by default. Leave this prop
            // off to offer Standard and Premium only. Roleplay has to be listed.
            // For a subtitle, use { model: "roleplay", description: "..." } instead.
            models={["roleplay", "premium", "standard"]}
            theme="dark"
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
