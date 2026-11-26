// Who is signed in on this browser. Demo only: this is not security.
import type { Role } from "../types";

export interface Current {
  email: string;
  role: Role;
}

const KEY = "bigkas.current";

/** A missing, blocked or malformed value all mean "signed out". */
export function readCurrent(): Current | null {
  try {
    const value = JSON.parse(window.localStorage.getItem(KEY) ?? "null") as Partial<Current> | null;
    if (!value || typeof value.email !== "string") return null;
    if (value.role !== "participant" && value.role !== "researcher") return null;
    return { email: value.email, role: value.role };
  } catch {
    return null;
  }
}

export function writeCurrent(current: Current): void {
  window.localStorage.setItem(KEY, JSON.stringify(current));
}

export function clearCurrent(): void {
  window.localStorage.removeItem(KEY);
}
