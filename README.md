# bigkas

A demo web portal for calibrated scoring of read aloud English: pronunciation, fluency and prosody. "Bigkas" is Filipino for spoken delivery.

> Planning stage. There is no application code yet and nothing is deployed. When built, every score and measurement in the demo will be simulated.

## What it will show

1. Reading sessions of 10 short sentences and phrase fragments.
2. Answers recorded in the browser, or uploaded as audio files.
3. Background analysis with a visible status.
4. Native, normalized, linear and ridge scores from GOPT, HuBERT Base and wav2vec 2.0 Large.
5. Speech rate, average pause length, average pitch and mean intensity.
6. A researcher report comparing scores with human ratings on sample data.
7. An Apple style interface for phones, tablets and laptops.

## Documents

1. [Design](docs/superpowers/specs/2026-11-26-bigkas-poc-design.md)
2. [Web app flow](docs/flow.md)
3. [Implementation plan](docs/superpowers/plans/2026-11-26-bigkas-demo.md)
4. [Interface mockups](docs/mockups/apple-style.html), open the file in a browser

## Planned stack

Next.js, TypeScript, Tailwind CSS, IndexedDB, Vitest and Playwright, hosted on Vercel.

## Privacy

The demo keeps recordings in the visitor's browser. Never commit recordings, personal data or `.env` files.

## License

No license has been chosen yet, so all rights are reserved.
