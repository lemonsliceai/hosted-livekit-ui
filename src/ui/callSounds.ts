"use client";

import { useEffect, useRef } from "react";
import hangupUrl from "./sounds/hangup.mp3";
import ringUrl from "./sounds/ring.m4a";

const HANGUP_VOLUME = 0.5;
const RING_INTERVAL_MS = 2000;
const RING_VOLUME = 0.5;

/** One-shot tone when the visitor hangs up. */
export function playHangupSound() {
  if (typeof window === "undefined") return;
  try {
    const audio = new Audio(hangupUrl);
    audio.volume = HANGUP_VOLUME;
    void audio.play().catch(() => {
      /* autoplay policy or a missing asset */
    });
  } catch {
    /* ignore */
  }
}

/** Repeats the ring clip while a call is still connecting. */
export function useCallingRingTone(active: boolean) {
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    if (!active) {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current.currentTime = 0;
      }
      return;
    }

    if (!audioRef.current) {
      const audio = new Audio(ringUrl);
      audio.preload = "auto";
      audio.volume = RING_VOLUME;
      audioRef.current = audio;
    }
    const audio = audioRef.current;
    audio.volume = RING_VOLUME;

    const play = () => {
      audio.currentTime = 0;
      void audio.play().catch(() => {
        /* autoplay policy or a missing asset */
      });
    };

    play();
    intervalRef.current = setInterval(play, RING_INTERVAL_MS);

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
      audio.pause();
      audio.currentTime = 0;
    };
  }, [active]);
}
