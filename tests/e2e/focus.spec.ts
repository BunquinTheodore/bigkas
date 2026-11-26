// The failure cases most likely to bite a person: microphone trouble, bad files, saving and old data.
import { expect, test, type Page } from "@playwright/test";
import { signIn, skipWithoutWebAudio, toneFile } from "./helpers";

type Hooks = Window & {
  __tracks: MediaStreamTrack[];
  __grant: () => void;
  __recorder?: MediaRecorder;
  __failSave?: boolean;
  __decoded?: boolean;
  __audios: HTMLMediaElement[];
};

const INTERRUPTED = "Recording was interrupted. Record again.";

/** Lets a test hold, deny or inspect the microphone. Call before the first page load. */
async function controlMicrophone(page: Page, mode: "hold" | "deny" | "pass") {
  await page.addInitScript((chosen) => {
    const hooks = window as unknown as Hooks;
    hooks.__tracks = [];
    const gate = new Promise<void>((resolve) => (hooks.__grant = resolve));
    const original = navigator.mediaDevices.getUserMedia.bind(navigator.mediaDevices);
    navigator.mediaDevices.getUserMedia = async (constraints) => {
      if (chosen === "deny") throw new DOMException("Denied", "NotAllowedError");
      if (chosen === "hold") await gate;
      const stream = await original(constraints);
      hooks.__tracks.push(...stream.getTracks());
      return stream;
    };
    window.MediaRecorder = class extends MediaRecorder {
      constructor(stream: MediaStream, options?: MediaRecorderOptions) {
        super(stream, options);
        hooks.__recorder = this;
      }
    };
  }, mode);
}

async function openFirstItem(page: Page) {
  await signIn(page, "Participant");
  await skipWithoutWebAudio(page);
  await page.getByRole("button", { name: "Start" }).first().click();
  await expect(page.getByRole("heading", { name: "Item 1 of 10" })).toBeVisible();
}

const upload = (page: Page, file = toneFile()) => page.getByLabel("Upload audio file").setInputFiles(file);
const submit = (page: Page) => page.getByRole("button", { name: "Submit" }).click();
const secondItem = (page: Page) => expect(page.getByRole("heading", { name: "Item 2 of 10" })).toBeVisible();
const trackStates = (page: Page) =>
  page.evaluate(() => (window as unknown as Hooks).__tracks.map((t) => t.readyState));

async function startRecording(page: Page) {
  await page.getByRole("button", { name: "Record" }).click();
  await expect(page.getByRole("button", { name: "Stop" })).toBeVisible();
}

test("upload and submit work while the microphone prompt is still open", async ({ page }) => {
  await controlMicrophone(page, "hold");
  await openFirstItem(page);
  await page.getByRole("button", { name: "Record" }).click();
  await upload(page);
  await submit(page);
  await secondItem(page);
});

test("a microphone granted after leaving the item is released at once", async ({ page }) => {
  await controlMicrophone(page, "hold");
  await openFirstItem(page);
  await page.getByRole("button", { name: "Record" }).click();
  await page.getByRole("link", { name: "Sessions" }).click();
  await expect(page.getByRole("heading", { name: "Reading sessions" })).toBeVisible();
  await page.evaluate(() => (window as unknown as Hooks).__grant());
  await expect.poll(() => trackStates(page)).toEqual(["ended"]);
});

test("a microphone granted after an upload does not start recording", async ({ page }) => {
  await controlMicrophone(page, "hold");
  await openFirstItem(page);
  await page.getByRole("button", { name: "Record" }).click();
  await upload(page);
  await expect(page.getByRole("button", { name: "Submit" })).toBeVisible();
  await page.evaluate(() => (window as unknown as Hooks).__grant());
  await expect.poll(() => trackStates(page)).toEqual(["ended"]);
  await expect(page.getByRole("button", { name: "Submit" })).toBeVisible();
});

test("a muted microphone, such as during a call, counts as an interruption", async ({ page }) => {
  await controlMicrophone(page, "pass");
  await openFirstItem(page);
  await startRecording(page);
  await page.evaluate(() => (window as unknown as Hooks).__tracks[0].dispatchEvent(new Event("mute")));
  await expect(page.getByText(INTERRUPTED)).toBeVisible();
  await expect(page.getByRole("button", { name: "Submit" })).toHaveCount(0);
});

test("a recorder failure counts as an interruption", async ({ page }) => {
  await controlMicrophone(page, "pass");
  await openFirstItem(page);
  await startRecording(page);
  await page.evaluate(() => (window as unknown as Hooks).__recorder?.dispatchEvent(new Event("error")));
  await expect(page.getByText(INTERRUPTED)).toBeVisible();
});

test("hiding the page counts as an interruption", async ({ page }) => {
  await controlMicrophone(page, "pass");
  await openFirstItem(page);
  await startRecording(page);
  await page.evaluate(() => {
    Object.defineProperty(document, "visibilityState", { configurable: true, get: () => "hidden" });
    document.dispatchEvent(new Event("visibilitychange"));
  });
  await expect(page.getByText(INTERRUPTED)).toBeVisible();
});

test("a denied microphone explains itself and upload still works", async ({ page }) => {
  await controlMicrophone(page, "deny");
  await openFirstItem(page);
  await page.getByRole("button", { name: "Record" }).click();
  await expect(page.getByText(/You can still upload a file\./)).toBeVisible();
  await upload(page);
  await submit(page);
  await secondItem(page);
});

test("a failed save keeps the answer for another try", async ({ page }) => {
  await page.addInitScript(() => {
    const original = IDBObjectStore.prototype.put;
    IDBObjectStore.prototype.put = function (...args: Parameters<typeof original>) {
      const hooks = window as unknown as Hooks;
      if (this.name === "responses" && hooks.__failSave) {
        hooks.__failSave = false;
        throw new DOMException("Full", "QuotaExceededError");
      }
      return original.apply(this, args);
    };
  });
  await openFirstItem(page);
  await upload(page);
  await page.evaluate(() => ((window as unknown as Hooks).__failSave = true));
  await submit(page);
  await expect(page.getByText("This item was not saved. Try Submit again.")).toBeVisible();
  await submit(page);
  await secondItem(page);
});

test("two tabs on the same item save one answer", async ({ page, context }) => {
  await openFirstItem(page);
  const other = await context.newPage();
  await other.goto(page.url());
  await upload(page);
  await submit(page);
  await secondItem(page);
  await upload(other);
  await submit(other);
  await secondItem(other);
  const saved = await page.evaluate(
    () =>
      new Promise<number>((resolve) => {
        indexedDB.open("bigkas").onsuccess = (event) => {
          const db = (event.target as IDBOpenDBRequest).result;
          const request = db.transaction("responses").objectStore("responses").count();
          request.onsuccess = () => resolve(request.result);
        };
      }),
  );
  expect(saved).toBe(1);
});

test("a long file is refused before it is decoded", async ({ page }) => {
  await page.addInitScript(() => {
    const original = AudioContext.prototype.decodeAudioData;
    AudioContext.prototype.decodeAudioData = function (...args: Parameters<typeof original>) {
      (window as unknown as Hooks).__decoded = true;
      return original.apply(this, args);
    };
  });
  await openFirstItem(page);
  await upload(page, toneFile(40));
  await expect(page.getByText("Audio must be 30 seconds or shorter.")).toBeVisible();
  expect(await page.evaluate(() => (window as unknown as Hooks).__decoded ?? false)).toBe(false);
});

test("error messages are readable on a light card", async ({ page }) => {
  await page.emulateMedia({ colorScheme: "light" });
  await openFirstItem(page);
  await upload(page, toneFile(2, 0));
  const message = page.getByText("No sound was detected. Try again.");
  await expect(message).toBeVisible();
  const ratio = await message.evaluate((element) => {
    const channels = (color: string) => color.match(/\d+/g)!.slice(0, 3).map(Number);
    const luminance = (color: string) => {
      const [r, g, b] = channels(color).map((v) => {
        const s = v / 255;
        return s <= 0.04045 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4;
      });
      return 0.2126 * r + 0.7152 * g + 0.0722 * b;
    };
    const card = element.closest("[data-testid='card']")!;
    const text = luminance(getComputedStyle(element).color);
    const background = luminance(getComputedStyle(card).backgroundColor);
    return (Math.max(text, background) + 0.05) / (Math.min(text, background) + 0.05);
  });
  expect(ratio).toBeGreaterThanOrEqual(4.5);
});

test("playback never overlaps and stops when the answer is redone", async ({ page }) => {
  await page.addInitScript(() => {
    const hooks = window as unknown as Hooks;
    hooks.__audios = [];
    const original = HTMLMediaElement.prototype.play;
    HTMLMediaElement.prototype.play = function () {
      if (!hooks.__audios.includes(this)) hooks.__audios.push(this);
      return original.call(this);
    };
  });
  const playing = () =>
    page.evaluate(() => (window as unknown as Hooks).__audios.filter((a) => !a.paused).length);
  await openFirstItem(page);
  await upload(page, toneFile(8));
  await page.getByRole("button", { name: "Play" }).click();
  await page.getByRole("button", { name: "Play" }).click();
  await expect.poll(playing).toBe(1);
  await page.getByRole("button", { name: "Redo" }).click();
  await expect.poll(playing).toBe(0);
});

test("a session saved against an older item bank shows a way out", async ({ page }) => {
  await openFirstItem(page);
  await page.evaluate(
    () =>
      new Promise<void>((resolve) => {
        indexedDB.open("bigkas").onsuccess = (event) => {
          const db = (event.target as IDBOpenDBRequest).result;
          const tx = db.transaction("attempts", "readwrite");
          const store = tx.objectStore("attempts");
          store.getAll().onsuccess = (e) => {
            for (const attempt of (e.target as IDBRequest).result) {
              store.put({ ...attempt, itemIds: attempt.itemIds.map(() => "retired-item") });
            }
          };
          tx.oncomplete = () => resolve();
        };
      }),
  );
  await page.reload();
  await expect(page.getByRole("heading", { name: "This page could not load" })).toBeVisible();
  await expect(page.getByRole("button", { name: "Reload" })).toBeVisible();
  await page.getByRole("button", { name: "Go to sign in" }).click();
  await expect(page).toHaveURL("/");
});
