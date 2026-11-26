// Sample reading items until the study's real item bank is added.
// Everyday English for any reader, not tied to a job or a field of study.
// Keep each item short: GOPT accepts at most 50 phonemes (8 words and 45 letters stays well under).
// A changed text needs a new id, so an old recording is never shown beside words that were not read.
import type { ReadingItem } from "../lib/types";

const sentences = [
  "The morning air feels cool and fresh.",
  "My family eats dinner together at night.",
  "She bought fresh vegetables at the market.",
  "The children are playing in the park.",
  "Please close the window before it rains.",
  "We walked along the river after lunch.",
  "My friend lives near the public library.",
  "He drinks a glass of water every morning.",
  "The bus arrives at half past seven.",
  "I like to read books before I sleep.",
  "Thank you very much for your help.",
  "The weather is warm and sunny today.",
  "They planted three small trees by the road.",
  "Our neighbors are friendly and very helpful.",
  "The little bird sang a sweet song.",
  "Could you tell me where the station is?",
  "I washed my clothes on Saturday afternoon.",
  "Healthy food gives the body more energy.",
  "The museum opens early on weekends.",
  "Learning a new language takes patience.",
];

const fragments = [
  "a cup of hot coffee",
  "under the big mango tree",
  "on the way to school",
  "early in the morning",
  "a bright blue umbrella",
  "near the front door",
  "after a long rainy day",
  "fresh bread from the bakery",
  "the sound of falling water",
  "my favorite place to visit",
];

export const ITEM_BANK: readonly ReadingItem[] = [
  ...sentences.map((text) => ({ type: "sentence" as const, text })),
  ...fragments.map((text) => ({ type: "fragment" as const, text })),
].map((item, index) => ({ id: `read-${String(index + 1).padStart(2, "0")}`, ...item }));
