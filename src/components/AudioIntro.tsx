"use client";

import { useState } from "react";
import { Headphones, Pause, Play } from "lucide-react";

/**
 * "Listen to Keith explain it" inline audio player.
 *
 * Uses a hidden <audio> element + custom play/pause button so the player
 * matches the rest of the app's design instead of inheriting the browser's
 * default audio chrome (which varies wildly between Chrome/Safari/Firefox).
 *
 * `preload="none"` keeps the page lightweight — the MP3 only downloads when
 * the user actually clicks play.
 */
export function AudioIntro() {
  const [audioRef, setAudioRef] = useState<HTMLAudioElement | null>(null);
  const [playing, setPlaying] = useState(false);
  const [progress, setProgress] = useState(0);
  const [duration, setDuration] = useState(0);

  function toggle() {
    if (!audioRef) return;
    if (audioRef.paused) {
      audioRef.play().catch(() => {
        /* autoplay rejected or file missing — silently ignore */
      });
    } else {
      audioRef.pause();
    }
  }

  function format(seconds: number) {
    if (!Number.isFinite(seconds)) return "0:00";
    const m = Math.floor(seconds / 60);
    const s = Math.floor(seconds % 60);
    return `${m}:${s.toString().padStart(2, "0")}`;
  }

  return (
    <div className="rounded-xl border bg-white p-4 shadow-sm sm:p-5">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <div className="flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-full bg-primary text-primary-foreground">
          <Headphones className="h-5 w-5" />
        </div>

        <div className="flex-1">
          <div className="text-sm font-semibold">Hear the story behind this tool</div>
          <div className="text-xs text-muted-foreground">
            Keith explains what RSV Drop Tool does, how it works, and why he built it.
          </div>
        </div>

        <button
          type="button"
          onClick={toggle}
          aria-label={playing ? "Pause introduction" : "Play introduction"}
          className="inline-flex h-10 items-center gap-2 self-start rounded-md bg-primary px-4 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90 sm:self-center"
        >
          {playing ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
          {playing ? "Pause" : "Listen"}
        </button>
      </div>

      {(playing || progress > 0) && (
        <div className="mt-3 flex items-center gap-3">
          <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-secondary">
            <div
              className="h-full bg-primary transition-all"
              style={{
                width: duration > 0 ? `${Math.min(100, (progress / duration) * 100)}%` : "0%",
              }}
            />
          </div>
          <div className="text-xs tabular-nums text-muted-foreground">
            {format(progress)} / {format(duration)}
          </div>
        </div>
      )}

      <audio
        ref={setAudioRef}
        src="/audio-explanation.mp3"
        preload="none"
        onPlay={() => setPlaying(true)}
        onPause={() => setPlaying(false)}
        onEnded={() => setPlaying(false)}
        onLoadedMetadata={(e) => setDuration(e.currentTarget.duration)}
        onTimeUpdate={(e) => setProgress(e.currentTarget.currentTime)}
        className="hidden"
      />
    </div>
  );
}
