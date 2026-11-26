// Sample reading items until the study's real item bank is added.
// Keep each item short: GOPT accepts at most 50 phonemes (8 words and 45 letters stays well under).
import type { ReadingItem } from "../lib/types";

const sentences = [
  "I enjoy working with a team.",
  "I can learn new skills quickly.",
  "My strength is staying calm under pressure.",
  "I manage my time with a daily plan.",
  "I led a small project last year.",
  "Feedback helps me improve my work.",
  "I listen carefully before I respond.",
  "I want to grow as a developer.",
  "We solved the problem as a group.",
  "I always check my code before sharing.",
  "Thank you for giving me this chance.",
  "I studied computer science at college.",
  "I enjoy solving difficult problems.",
  "Communication is important in every team.",
  "I finished the task before the deadline.",
  "I asked for help when I needed it.",
  "My goal is to keep learning.",
  "I adapt well to new situations.",
  "I take responsibility for my mistakes.",
  "I am ready to start next month.",
];

const fragments = [
  "during my internship",
  "a strong sense of teamwork",
  "under a tight deadline",
  "my greatest strength",
  "working with other students",
  "careful and clear communication",
  "in my free time",
  "a challenging group project",
  "after several attempts",
  "the next step in my career",
];

export const ITEM_BANK: readonly ReadingItem[] = [
  ...sentences.map((text) => ({ type: "sentence" as const, text })),
  ...fragments.map((text) => ({ type: "fragment" as const, text })),
].map((item, index) => ({ id: `item-${String(index + 1).padStart(2, "0")}`, ...item }));
