export type Role = "participant" | "researcher";
export type Category = "pronunciation" | "fluency" | "prosody";
export type ModelId = "gopt" | "hubert" | "wav2vec2";
export type SessionId = "a" | "b" | "c";
export type ItemType = "sentence" | "fragment";
export type Source = "recorded" | "uploaded";
export type Method = "normalized" | "linear" | "ridge";

export interface ReadingItem {
  id: string;
  type: ItemType;
  text: string;
}

export interface Profile {
  email: string;
  participantCode: string | null;
  consentedAt: number | null;
}

export interface Attempt {
  id: string;
  email: string;
  sessionId: SessionId;
  itemIds: string[];
  submittedCount: number;
  startedAt: number;
  submittedAt: number | null;
}

export interface StoredResponse {
  attemptId: string;
  position: number;
  source: Source;
  wav: ArrayBuffer;
  durationMs: number;
  submittedAt: number;
}

export type Score = number | null;

export interface ScoreSet {
  native: Score;
  normalized: Score;
  linear: Score;
  ridge: Score;
}

export interface Measures {
  speechRate: number | null;
  pauseLength: number | "none" | null;
  pitch: number | null;
  intensity: number | null;
}

export interface ItemResult {
  position: number;
  itemId: string;
  source: Source;
  scores: Record<Category, Record<ModelId, ScoreSet>>;
  measures: Measures;
}

export interface SampleRow {
  speaker: string;
  split: "calibration" | "test";
  itemId: string;
  ratings: Record<Category, (number | null)[]>;
  native: Record<ModelId, Record<Category, number | null>>;
}
