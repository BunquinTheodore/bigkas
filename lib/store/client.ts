// One shared repository for the browser tab.
import { openRepository, type Repository } from "./repository";

let cached: Promise<Repository> | null = null;

export function getRepository(): Promise<Repository> {
  cached ??= openRepository().catch((error: unknown) => {
    cached = null;
    throw error;
  });
  return cached;
}

/** False when the browser blocks storage, for example in some private modes. */
export async function storageAvailable(): Promise<boolean> {
  try {
    window.localStorage.getItem("bigkas.current");
    await getRepository();
    return true;
  } catch (error) {
    console.error("Browser storage is unavailable", error);
    return false;
  }
}
