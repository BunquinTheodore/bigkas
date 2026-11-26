// Seeded randomness so every simulated number stays the same between visits.
// No imports: the sample data script loads this file directly in Node.

const FNV_OFFSET = 0x811c9dc5;
const FNV_PRIME = 0x01000193;
const MULBERRY_STEP = 0x6d2b79f5;
const UINT32_RANGE = 4294967296;

export function hashSeed(...parts: (string | number)[]): number {
  const text = parts.join("|");
  let hash = FNV_OFFSET;
  for (let i = 0; i < text.length; i++) {
    hash = Math.imul(hash ^ text.charCodeAt(i), FNV_PRIME);
  }
  return hash >>> 0;
}

export function createRng(seed: number): () => number {
  let state = seed >>> 0;
  return () => {
    state = (state + MULBERRY_STEP) >>> 0;
    let t = state;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / UINT32_RANGE;
  };
}

/** Standard normal value (Box Muller). */
export function gaussian(rng: () => number): number {
  const radius = Math.sqrt(-2 * Math.log(1 - rng()));
  return radius * Math.cos(2 * Math.PI * rng());
}
