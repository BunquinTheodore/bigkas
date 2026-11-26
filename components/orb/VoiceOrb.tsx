"use client";

import { useEffect, useRef, useState, type ReactNode, type RefObject } from "react";
import { runOrb, type OrbInput } from "./runOrb";
import { useOrbAllowed } from "./useOrbAllowed";

/** Waits until the page has nothing urgent to do. Returns the function that cancels the wait. */
function whenIdle(run: () => void): () => void {
  if (typeof window.requestIdleCallback === "function") {
    const id = window.requestIdleCallback(run, { timeout: 1000 });
    return () => window.cancelIdleCallback(id);
  }
  const id = globalThis.setTimeout(run, 200);
  return () => globalThis.clearTimeout(id);
}

/** Adds a drawing orb to `box`. `onEnd` runs once, whether it is released or the context is lost. */
async function mountOrb(box: HTMLElement, input: () => OrbInput, wanted: () => boolean, onEnd: () => void) {
  const { createOrbScene } = await import("./scene");
  if (!wanted()) return null;
  const canvas = document.createElement("canvas");
  canvas.className = "block h-full w-full";
  const scene = createOrbScene(canvas);
  box.appendChild(canvas);
  const halt = runOrb(scene, box, input);
  let ended = false;
  const end = () => {
    if (ended) return;
    ended = true;
    canvas.removeEventListener("webglcontextlost", end);
    halt();
    scene.dispose();
    canvas.remove();
    onEnd();
  };
  canvas.addEventListener("webglcontextlost", end);
  return end;
}

/** Loads the 3D code when allowed and says whether the orb is being drawn. */
function useOrb(allowed: boolean, host: RefObject<HTMLDivElement | null>, input: RefObject<OrbInput>) {
  const [live, setLive] = useState(false);

  useEffect(() => {
    const box = host.current;
    if (!allowed || !box) return;
    let wanted = true;
    let release: (() => void) | null = null;
    const start = async () => {
      release = await mountOrb(box, () => input.current, () => wanted, () => setLive(false));
      if (release) setLive(true);
    };
    const cancel = whenIdle(() => {
      start().catch((error: unknown) => console.warn("The 3D orb could not start", error));
    });
    return () => {
      wanted = false;
      cancel();
      release?.();
    };
  }, [allowed, host, input]);

  return live;
}

interface VoiceOrbProps {
  read?: (() => number) | null;
  turning?: boolean;
  /** Sets the height. The orb is a square of that height in the middle. */
  className: string;
  /** Shown while the 3D code loads, and instead of it where 3D is unavailable or unwanted. */
  fallback: ReactNode;
}

/** Decoration only: buttons, the timer and status text carry all meaning. */
export function VoiceOrb({ read = null, turning = false, className, fallback }: VoiceOrbProps) {
  const host = useRef<HTMLDivElement>(null);
  const input = useRef<OrbInput>({ read, turning });
  const live = useOrb(useOrbAllowed(), host, input);

  useEffect(() => {
    input.current = { read, turning };
  }, [read, turning]);

  return (
    <div
      data-testid="voice-orb"
      data-mode={live ? "3d" : "plain"}
      aria-hidden
      className={`relative flex w-full shrink-0 items-center justify-center ${className}`}
    >
      {!live && fallback}
      <div ref={host} className="pointer-events-none absolute inset-y-0 left-1/2 aspect-square -translate-x-1/2" />
    </div>
  );
}
