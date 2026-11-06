"use client";

import { useCallback, useEffect, useRef, useState } from "react";

type Playing = { id: string; audio: HTMLAudioElement };

/** One voice preview plays at a time. Pressing the playing voice again stops it. */
export function useVoicePreview() {
  const playingRef = useRef<Playing | null>(null);
  const [playingId, setPlayingId] = useState<string | null>(null);

  const stop = useCallback(() => {
    playingRef.current?.audio.pause();
    playingRef.current = null;
    setPlayingId(null);
  }, []);

  const toggle = useCallback(
    (id: string, src: string) => {
      if (playingRef.current?.id === id) {
        stop();
        return;
      }
      stop();
      const audio = new Audio(src);
      const entry: Playing = { id, audio };
      playingRef.current = entry;
      setPlayingId(id);
      const clear = () => {
        if (playingRef.current === entry) stop();
      };
      audio.onended = clear;
      audio.onerror = clear;
      void audio.play().catch(clear);
    },
    [stop],
  );

  useEffect(
    () => () => {
      playingRef.current?.audio.pause();
      playingRef.current = null;
    },
    [],
  );

  return { playingId, toggle };
}
