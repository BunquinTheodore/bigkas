"use client";

import { useCallback, useEffect, useRef } from "react";

/** One audio element per take. Playing again restarts it; changing the take or leaving stops it. */
export function usePlayback(url: string | null): () => void {
  const audio = useRef<HTMLAudioElement | null>(null);

  useEffect(() => {
    if (!url) return;
    const element = new Audio(url);
    audio.current = element;
    return () => {
      element.pause();
      audio.current = null;
    };
  }, [url]);

  return useCallback(() => {
    const element = audio.current;
    if (!element) return;
    element.currentTime = 0;
    element.play().catch((error: unknown) => console.warn("Could not play the answer", error));
  }, []);
}
