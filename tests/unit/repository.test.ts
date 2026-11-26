import "fake-indexeddb/auto";
import { expect, test } from "vitest";
import { createRng } from "@/lib/rng";
import { openRepository } from "@/lib/store/repository";

const fresh = () => openRepository(`test-${Math.random()}`);
const answer = (attemptId: string, position: number) =>
  ({ attemptId, position, source: "recorded" as const, wav: new ArrayBuffer(8), durationMs: 2000 });

test("codes are stable per email, researchers get none", async () => {
  const repo = await fresh();
  expect((await repo.signIn("a@b.com", "researcher")).participantCode).toBeNull();
  expect((await repo.signIn("a@b.com", "participant")).participantCode).toBe("P001");
  expect((await repo.signIn("c@d.com", "participant")).participantCode).toBe("P002");
  expect((await repo.signIn(" A@B.com ", "participant")).participantCode).toBe("P001");
});
test("one attempt per session with a fixed draw", async () => {
  const repo = await fresh();
  const first = await repo.startAttempt("a@b.com", "a", createRng(1), 100);
  expect(await repo.startAttempt("a@b.com", "a", createRng(2), 200)).toEqual(first);
  expect(new Set(first.itemIds).size).toBe(10);
});
test("order is enforced and the tenth item submits the attempt", async () => {
  const repo = await fresh();
  const { id } = await repo.startAttempt("a@b.com", "a", createRng(1), 0);
  await expect(repo.submitResponse(answer(id, 2), 1)).rejects.toMatchObject({ code: "out-of-order" });
  for (let p = 1; p <= 9; p++) expect((await repo.submitResponse(answer(id, p), p)).submittedAt).toBeNull();
  await expect(repo.submitResponse(answer(id, 1), 99)).rejects.toMatchObject({ code: "already-submitted" });
  expect((await repo.submitResponse(answer(id, 10), 500)).submittedAt).toBe(500);
});
test("two quick submits save once", async () => {
  const repo = await fresh();
  const { id } = await repo.startAttempt("a@b.com", "a", createRng(1), 0);
  const both = await Promise.allSettled([repo.submitResponse(answer(id, 1), 1), repo.submitResponse(answer(id, 1), 2)]);
  expect(both.filter((r) => r.status === "fulfilled")).toHaveLength(1);
  expect(await repo.listResponses(id)).toHaveLength(1);
});
test("clearAll empties the store", async () => {
  const repo = await fresh();
  await repo.signIn("a@b.com", "participant");
  await repo.clearAll();
  expect(await repo.getProfile("a@b.com")).toBeNull();
});
