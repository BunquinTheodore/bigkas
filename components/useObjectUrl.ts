"use client";

import { useEffect, useState } from "react";

/** A playable URL for WAV bytes, released when it is no longer used. */
export function useObjectUrl(wav: ArrayBuffer | null): string | null {
  const [url, setUrl] = useState<string | null>(null);

  useEffect(() => {
    if (!wav) return;
    const next = URL.createObjectURL(new Blob([wav], { type: "audio/wav" }));
    setUrl(next);
    return () => {
      URL.revokeObjectURL(next);
      setUrl(null);
    };
  }, [wav]);

  return url;
}
