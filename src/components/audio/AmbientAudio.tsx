"use client";

import { useCallback, useEffect, useRef, useState } from "react";

const STORAGE_KEY = "optimus-ambient-muted";
const SRC = "/audio/ambient.mp3";
const VOLUME = 0.32;

function readMutedPreference(): boolean {
  if (typeof window === "undefined") return false;
  return localStorage.getItem(STORAGE_KEY) === "true";
}

export function AmbientAudio() {
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const [muted, setMuted] = useState(readMutedPreference);

  useEffect(() => {
    const audio = new Audio(SRC);
    audio.loop = true;
    audio.volume = VOLUME;
    audio.preload = "auto";
    audioRef.current = audio;

    return () => {
      audio.pause();
      audio.removeAttribute("src");
      audio.load();
      audioRef.current = null;
    };
  }, []);

  const syncPlayback = useCallback(async () => {
    const audio = audioRef.current;
    if (!audio) return;

    if (muted) {
      audio.pause();
      return;
    }

    try {
      await audio.play();
    } catch {
      // Blocked until the user interacts — gesture listeners below will retry.
    }
  }, [muted]);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, String(muted));
    void syncPlayback();
  }, [muted, syncPlayback]);

  // Browsers block autoplay — start on the first tap or key press anywhere.
  useEffect(() => {
    if (muted) return;

    const unlock = () => {
      void syncPlayback();
      document.removeEventListener("pointerdown", unlock);
      document.removeEventListener("keydown", unlock);
    };

    document.addEventListener("pointerdown", unlock);
    document.addEventListener("keydown", unlock);
    return () => {
      document.removeEventListener("pointerdown", unlock);
      document.removeEventListener("keydown", unlock);
    };
  }, [muted, syncPlayback]);

  return (
    <button
      type="button"
      className="ambient-audio-toggle"
      onClick={() => setMuted((value) => !value)}
      aria-label={muted ? "Turn on ambient audio" : "Turn off ambient audio"}
      aria-pressed={!muted}
      title={muted ? "Turn on ambient audio" : "Turn off ambient audio"}
    >
      {muted ? <SpeakerOffIcon /> : <SpeakerOnIcon />}
    </button>
  );
}

function SpeakerOnIcon() {
  return (
    <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M11 5L6 9H3v6h3l5 4V5z" strokeLinejoin="round" />
      <path d="M15.5 8.5a5 5 0 010 7" strokeLinecap="round" />
      <path d="M18 6a8 8 0 010 12" strokeLinecap="round" />
    </svg>
  );
}

function SpeakerOffIcon() {
  return (
    <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M11 5L6 9H3v6h3l5 4V5z" strokeLinejoin="round" />
      <path d="M16 9l5 5M21 9l-5 5" strokeLinecap="round" />
    </svg>
  );
}
