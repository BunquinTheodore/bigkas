# bigkas

A demo web portal for calibrated scoring of read aloud English: pronunciation, fluency and prosody. "Bigkas" is Filipino for spoken delivery.

> Every score and measurement is simulated. No speech model runs. Recordings stay in your browser.

## What it does

1. Reading sessions of 10 short sentences and phrase fragments, one attempt per session.
2. Answers recorded in the browser, or uploaded as audio files up to 10 MB and 30 seconds.
3. A simulated background analysis: Pending, then Processing, then Completed after 30 seconds.
4. Native, normalized, linear and ridge scores from GOPT, HuBERT Base and wav2vec 2.0 Large.
5. Speech rate, average pause length, average pitch and mean intensity.
6. A researcher report comparing scores with human ratings on fixed sample data.
7. An Apple style interface for phones, tablets and laptops, light and dark.

## Run it

Needs Node 24.

```bash
npm install
npm run dev
```

Open http://localhost:3000, sign in with any email and pick a role. There is no password.

## Test it

```bash
npm test
npm run coverage
npx playwright install chromium webkit
npm run test:e2e
```

Playwright's WebKit build for Windows has no audio engine, so the audio steps are skipped there. Check recording and upload on a real iPhone and an Android phone.

## Before a presentation

1. Each device keeps its own data, so present on the device where you created it.
2. Safari can erase a site's stored data after seven days of use without a visit, so create demo data shortly before presenting.
3. Browsers inside chat apps may block the microphone. Open the link in Safari or Chrome.
4. "Clear demo data" on the sign in screen resets everything.

## Sample data

Reading items are in `data/items.ts` until the real item bank replaces them. `npm run sample-data` rebuilds `data/sample-dataset.json` from a fixed seed. Its settings are not tuned to favour any model or method.

## Deploy

Import the repository into Vercel as a Next.js project. No environment variables are needed.

## Documents

1. [Design](docs/superpowers/specs/2026-11-26-bigkas-poc-design.md)
2. [Web app flow](docs/flow.md)
3. [Implementation plan](docs/superpowers/plans/2026-11-26-bigkas-demo.md)
4. [Interface mockups](docs/mockups/apple-style.html), open the file in a browser

## License

No license has been chosen yet, so all rights are reserved.
