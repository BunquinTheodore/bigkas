// The frame loop around an orb scene. It rests while the page is hidden or the orb is off screen.
import type { OrbScene } from "./scene";

export interface OrbInput {
  /** Current microphone loudness from 0 to 1, or null when nothing is being recorded. */
  read: (() => number) | null;
  turning: boolean;
}

const MAX_PIXEL_RATIO = 2;
/** A calm shape needs only 30 frames a second, which halves the work for a phone. */
const FRAME_MS = 1000 / 30;
const SMOOTHING = 0.18;
const IDLE_TURN = 0.25;
const BUSY_TURN = 1.8;

/** Draws one frame per animation frame from the newest input. */
function frames(scene: OrbScene, input: () => OrbInput) {
  let level = 0;
  let turn = 0;
  let last = performance.now();
  return (now: number) => {
    const { read, turning } = input();
    turn += (Math.max(0, now - last) / 1000) * (turning ? BUSY_TURN : IDLE_TURN);
    last = now;
    level += (Math.min(1, (read?.() ?? 0) * 2) - level) * SMOOTHING;
    scene.draw(now / 1000, level, turn);
  };
}

/** Starts drawing into `host` and returns the function that stops it. */
export function runOrb(scene: OrbScene, host: HTMLElement, input: () => OrbInput): () => void {
  const draw = frames(scene, input);
  let frame = 0;
  let onScreen = true;
  let drawnAt = 0;
  const tick = (now: number) => {
    frame = requestAnimationFrame(tick);
    // One millisecond of slack, so a 60 Hz screen draws every second frame.
    if (now - drawnAt < FRAME_MS - 1) return;
    drawnAt = now;
    draw(now);
  };
  const update = () => {
    cancelAnimationFrame(frame);
    if (onScreen && !document.hidden) frame = requestAnimationFrame(tick);
  };
  const resize = () => scene.resize(host.clientWidth, Math.min(window.devicePixelRatio, MAX_PIXEL_RATIO));
  const watcher = new IntersectionObserver(([entry]) => {
    onScreen = entry.isIntersecting;
    update();
  });
  const sizer = new ResizeObserver(resize);
  watcher.observe(host);
  sizer.observe(host);
  document.addEventListener("visibilitychange", update);
  resize();
  update();
  return () => {
    cancelAnimationFrame(frame);
    watcher.disconnect();
    sizer.disconnect();
    document.removeEventListener("visibilitychange", update);
  };
}
