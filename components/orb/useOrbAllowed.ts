"use client";

import { useEffect, useState } from "react";
import { useMediaQuery } from "@/components/useMediaQuery";

let support: boolean | null = null;

/** Checked once: the test context is handed straight back. */
function hasWebGl2(): boolean {
  if (support === null) {
    const probe = document.createElement("canvas").getContext("webgl2");
    probe?.getExtension("WEBGL_lose_context")?.loseContext();
    support = Boolean(probe);
  }
  return support;
}

/** Whether this device can show the 3D orb and has not asked for reduced motion. */
export function useOrbAllowed(): boolean {
  const reduced = useMediaQuery("(prefers-reduced-motion: reduce)");
  const [supported, setSupported] = useState(false);

  useEffect(() => setSupported(hasWebGl2()), []);

  return supported && !reduced;
}
