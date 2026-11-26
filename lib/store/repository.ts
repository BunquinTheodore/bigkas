// All demo data lives in the visitor's browser (IndexedDB). Replace this module to use a server.
import { openDB, type DBSchema, type IDBPDatabase } from "idb";
import { ITEMS_PER_ATTEMPT } from "../config";
import { drawItemIds } from "../items";
import type { Attempt, Profile, Role, SessionId, Source, StoredResponse } from "../types";

type StoreErrorCode = "already-submitted" | "out-of-order" | "not-found";

export class StoreError extends Error {
  readonly code: StoreErrorCode;

  constructor(code: StoreErrorCode) {
    super(`Storage error: ${code}`);
    this.name = "StoreError";
    this.code = code;
  }
}

export interface NewResponse {
  attemptId: string;
  position: number;
  source: Source;
  wav: ArrayBuffer;
  durationMs: number;
}

export interface Repository {
  signIn(email: string, role: Role): Promise<Profile>;
  getProfile(email: string): Promise<Profile | null>;
  giveConsent(email: string, now: number): Promise<Profile>;
  startAttempt(email: string, sessionId: SessionId, rng: () => number, now: number): Promise<Attempt>;
  listAttempts(email: string): Promise<Attempt[]>;
  getAttempt(id: string): Promise<Attempt | null>;
  submitResponse(input: NewResponse, now: number): Promise<Attempt>;
  listResponses(attemptId: string): Promise<StoredResponse[]>;
  clearAll(): Promise<void>;
}

interface BigkasSchema extends DBSchema {
  profiles: { key: string; value: Profile };
  attempts: { key: string; value: Attempt; indexes: { email: string } };
  responses: { key: [string, number]; value: StoredResponse };
  meta: { key: string; value: number };
}

type Db = IDBPDatabase<BigkasSchema>;

const PARTICIPANT_COUNTER = "participantCounter";

const normalizeEmail = (email: string) => email.trim().toLowerCase();

function createStores(db: Db) {
  db.createObjectStore("profiles", { keyPath: "email" });
  db.createObjectStore("attempts", { keyPath: "id" }).createIndex("email", "email");
  db.createObjectStore("responses", { keyPath: ["attemptId", "position"] });
  db.createObjectStore("meta");
}

/** Creates the profile if needed and gives a participant their code on first participant sign in. */
async function signIn(db: Db, rawEmail: string, role: Role): Promise<Profile> {
  const email = normalizeEmail(rawEmail);
  const tx = db.transaction(["profiles", "meta"], "readwrite");
  const profiles = tx.objectStore("profiles");
  let profile = (await profiles.get(email)) ?? { email, participantCode: null, consentedAt: null };
  if (role === "participant" && !profile.participantCode) {
    const meta = tx.objectStore("meta");
    const next = ((await meta.get(PARTICIPANT_COUNTER)) ?? 0) + 1;
    await meta.put(next, PARTICIPANT_COUNTER);
    profile = { ...profile, participantCode: `P${String(next).padStart(3, "0")}` };
  }
  await profiles.put(profile);
  await tx.done;
  return profile;
}

async function giveConsent(db: Db, email: string, now: number): Promise<Profile> {
  const tx = db.transaction("profiles", "readwrite");
  const profile = await tx.store.get(normalizeEmail(email));
  if (!profile) throw new StoreError("not-found");
  const updated = { ...profile, consentedAt: now };
  await tx.store.put(updated);
  await tx.done;
  return updated;
}

/** Returns the existing attempt for this session, or draws the items once and saves a new one. */
async function startAttempt(
  db: Db,
  rawEmail: string,
  sessionId: SessionId,
  rng: () => number,
  now: number,
): Promise<Attempt> {
  const email = normalizeEmail(rawEmail);
  const tx = db.transaction("attempts", "readwrite");
  const mine = await tx.store.index("email").getAll(email);
  const existing = mine.find((a) => a.sessionId === sessionId);
  if (existing) return existing;
  const attempt: Attempt = {
    id: crypto.randomUUID(),
    email,
    sessionId,
    itemIds: drawItemIds(rng),
    submittedCount: 0,
    startedAt: now,
    submittedAt: null,
  };
  await tx.store.add(attempt);
  await tx.done;
  return attempt;
}

/** Saves one answer in order. The tenth answer marks the attempt as submitted. */
async function submitResponse(db: Db, input: NewResponse, now: number): Promise<Attempt> {
  const tx = db.transaction(["attempts", "responses"], "readwrite");
  const attempts = tx.objectStore("attempts");
  const attempt = await attempts.get(input.attemptId);
  if (!attempt) throw new StoreError("not-found");
  if (input.position <= attempt.submittedCount) throw new StoreError("already-submitted");
  if (input.position !== attempt.submittedCount + 1) throw new StoreError("out-of-order");
  await tx.objectStore("responses").put({ ...input, submittedAt: now });
  const updated: Attempt = {
    ...attempt,
    submittedCount: input.position,
    submittedAt: input.position === ITEMS_PER_ATTEMPT ? now : null,
  };
  await attempts.put(updated);
  await tx.done;
  return updated;
}

async function clearAll(db: Db): Promise<void> {
  const names = ["profiles", "attempts", "responses", "meta"] as const;
  const tx = db.transaction(names, "readwrite");
  await Promise.all(names.map((name) => tx.objectStore(name).clear()));
  await tx.done;
}

export async function openRepository(name = "bigkas"): Promise<Repository> {
  const db = await openDB<BigkasSchema>(name, 1, { upgrade: createStores });
  return {
    signIn: (email, role) => signIn(db, email, role),
    getProfile: async (email) => (await db.get("profiles", normalizeEmail(email))) ?? null,
    giveConsent: (email, now) => giveConsent(db, email, now),
    startAttempt: (email, sessionId, rng, now) => startAttempt(db, email, sessionId, rng, now),
    listAttempts: (email) => db.getAllFromIndex("attempts", "email", normalizeEmail(email)),
    getAttempt: async (id) => (await db.get("attempts", id)) ?? null,
    submitResponse: (input, now) => submitResponse(db, input, now),
    listResponses: (attemptId) =>
      db.getAll("responses", IDBKeyRange.bound([attemptId, 0], [attemptId, Number.MAX_SAFE_INTEGER])),
    clearAll: () => clearAll(db),
  };
}
