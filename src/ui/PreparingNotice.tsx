import { useEffect, useState } from "react";

const HINTS = [
  "This only happens once per avatar.",
  "Unmute yourself to talk.",
  "Use chat to send messages.",
];

const HINT_INTERVAL_MS = 4000;

/** Copy on the preparing screen: a fixed title and timing line, plus a rotating hint. */
export function PreparingNotice() {
  const [index, setIndex] = useState(0);
  useEffect(() => {
    const timer = setInterval(() => setIndex((current) => (current + 1) % HINTS.length), HINT_INTERVAL_MS);
    return () => clearInterval(timer);
  }, []);

  return (
    <div className="ls-preparing-copy">
      <p className="ls-preparing-title">Preparing the avatar</p>
      <p>Takes around 30 seconds.</p>
      <p key={index} className="ls-preparing-hint">
        {HINTS[index]}
      </p>
    </div>
  );
}
