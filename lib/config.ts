// Study and demo constants. Only type imports: the sample data script loads this file in Node.
import type { Category, ModelId, SessionId } from "./types";

export const ITEMS_PER_ATTEMPT = 10;

export const MIN_RECORDING_SECONDS = 1;
export const MAX_RECORDING_SECONDS = 30;
export const DURATION_TOLERANCE_SECONDS = 0.5;
export const MAX_UPLOAD_BYTES = 10 * 1024 * 1024;
export const SILENCE_PEAK = 0.01;
export const TARGET_SAMPLE_RATE = 16000;

/** Simulated analysis: Pending until PENDING_MS, Processing until COMPLETE_MS. */
export const PENDING_MS = 10_000;
export const COMPLETE_MS = 30_000;

export const LAMBDA_GRID = [0.001, 0.01, 0.1, 1, 10, 100] as const;
export const UNAVAILABLE_RATE = 1 / 30;
export const SAMPLE_SEED = 20261126;

export const CATEGORIES: readonly Category[] = ["pronunciation", "fluency", "prosody"];
export const MODELS: readonly ModelId[] = ["gopt", "hubert", "wav2vec2"];

export const MODEL_LABELS: Record<ModelId, string> = {
  gopt: "GOPT",
  hubert: "HuBERT Base",
  wav2vec2: "wav2vec 2.0 Large",
};

/** Upper end of each model's own score scale. */
export const NATIVE_MAX: Record<ModelId, number> = { gopt: 2, hubert: 10, wav2vec2: 10 };

export const SESSIONS: readonly { id: SessionId; title: string }[] = [
  { id: "a", title: "Session A" },
  { id: "b", title: "Session B" },
  { id: "c", title: "Session C" },
];
