# bigkas proof of concept: design

Date: 26 November 2026. Status: draft, waiting for approval. Nothing is built yet.

The screen by screen flow is in [flow.md](../../flow.md).

## 1. Intent

bigkas is a demo web portal for a study that tests whether regression calibration brings automated speech scores closer to human ratings. A participant reads short English sentences and phrase fragments aloud. The portal shows scores for pronunciation, fluency and prosody from three models, plus raw acoustic measurements.

This build exists to show that flow at a thesis defense. Analysis is hardcoded and no model runs. Real study recordings are collected some other way.

Success (proposed): someone can sign in, finish a session, watch the status change, open the results and open the agreement report in one sitting, and can never mistake a simulated number for a real one.

## 2. Decisions

| Topic | Decision | Source |
|---|---|---|
| Name | bigkas, Filipino for spoken delivery | Decided |
| Purpose | Demo only | Decided |
| Analysis | Background processing and scores are hardcoded | Decided |
| Extras | Audio upload and agreement report are in. CSV export and transcripts are out | Decided |
| Hosting | Vercel later. Do not deploy yet | Decided |
| Repository | Public | Decided |
| Storage | Everything stays in the visitor's browser, no server | Proposed |
| Session rules | 10 items drawn once, one attempt per session, each item submitted before the next | Study design |
| Retakes | Allowed until the item is submitted | Proposed |
| Time limit | 30 seconds per item, held in one constant | Proposed |
| Raw score | Shown on each model's own scale: GOPT 0 to 2, HuBERT and wav2vec 2.0 about 0 to 10 | Proposed. The request said 0 to 10 for all |
| Baseline | The clipped normalized score | Study design |
| Wording | "Reading session". No feedback or coaching text | Proposed |

## 3. Goals, non goals, anti goals

Goals

1. The participant flow works end to end.
2. Results are shown per item and as a session summary.
3. The agreement report is computed from a fixed sample dataset with the study's formulas.
4. Numbers agree with each other. Derived values are computed from hardcoded inputs, never typed in.
5. Works on phone, tablet and desktop, and needs no secrets to run or deploy.

Non goals

1. Running GOPT, HuBERT, wav2vec 2.0, Whisper, Praat or FFmpeg.
2. Collecting study data, server storage, real accounts or real access control.
3. CSV export, transcripts, evaluator rating screens, an item bank editor, significance tests.
4. Deploying.

Anti goals, which count as failure even if everything runs

1. A simulated or sample number shown without a label.
2. A screen that coaches, grades or gamifies the speaker.
3. Sample data tuned so that one method looks best.

## 4. Approaches

| Approach | What it is | Strength | Cost |
|---|---|---|---|
| A. Browser only (chosen) | Next.js app, data kept in IndexedDB | No server, no secrets, no fees, audio never leaves the device | Each browser has its own data. A session recorded on a phone cannot be opened on a laptop |
| B. Small backend | Next.js, Postgres, private Vercel Blob, email sign in | Shared across devices, real accounts, closer to a live portal | Setup, secrets, storage limits, personal data to protect |
| C. Click through mock | Fixed screens with no recording | Fastest | Does not show recording or upload |

A is chosen because the portal is demo only and the simplest build is preferred. Keep all data access behind one module so that B could replace it later.

## 5. Screens

Layout sketches. All values shown are placeholders.

Sessions

```
Reading sessions                         participant@example.com   P001
Session A    10 items    Not started          [Start]
Session B    10 items    In progress 4 of 10  [Resume]
Session C    10 items    Processing           [View status]
```

Item

```
Session B    Item 5 of 10    Phrase fragment

"Text to read appears here"

[Record]  0:00 / 0:30      or  [Upload audio file]
After capture:  [Play]  [Redo]  [Submit]
```

Item results

```
Item 5 of 10    SIMULATED    recorded          [Play]   [Previous] [Next]
Tabs: Pronunciation | Fluency | Prosody
Model            Native        Normalized   Linear   Ridge
GOPT             0.00 of 2     0.00         0.00     0.00
HuBERT Base      0.00 of 10    0.00         0.00     0.00
wav2vec Large    0.00 of 10    0.00         0.00     0.00
Speech rate 0.0 syll/s  Avg pause 0.00 s  Avg pitch 000 Hz  Intensity 00 dB
```

The session summary uses the same table with means, "n of 10" beside each value, and a list of the ten items.

Agreement report

```
Agreement with human ratings    SAMPLE DATA    Category: Fluency
Model       Method     MAE     RMSE    Spearman   Coverage
GOPT        Baseline   0.000   0.000   0.000      00%
            Linear     0.000   0.000   0.000
            Ridge      0.000   0.000   0.000
Held out speakers: 20    Items compared: 000
```

On narrow screens, tables turn into one card per model.

## 6. Behaviour

### Sign in and consent

1. The visitor enters an email and picks a role, participant or researcher, at each sign in. There is no password and nothing is sent.
2. A participant gets a code (P001, P002 and so on), counted per browser. The code, consent and attempts belong to the email, so signing in again with it restores them.
3. Before the first session, a consent notice says what is recorded, that it stays in this browser and that this is a demo. It requires an "I am 18 or older" check. Declining returns to sign in.
4. Role checks exist only to separate the two views. They are not security.
5. Every signed in page has "Sign out", which returns to the sign in screen.
6. A "Clear demo data" button on the sign in screen removes everything after a confirmation.

### Sessions

1. There are three sample sessions. Each shows Not started, In progress (n of 10), Pending, Processing or Completed.
2. Starting a session draws 10 different items at random from a bank of 30 sample items and saves them, so a refresh cannot redraw.
3. One attempt per participant per session. An unfinished attempt resumes at the first item not yet submitted.
4. Items are sentences or phrase fragments, each short enough for GOPT's 50 phoneme input limit.

### Recording and upload

1. Record (stops by itself at 30 s) or upload an audio file the browser can decode, up to 10 MB and 30 s.
2. Turn off echo cancellation, noise suppression and automatic gain control, because the study scores audio without denoising and measures intensity.
3. Convert recordings and uploads to 16 kHz mono 16 bit WAV in the browser, and play that file back.
4. Reject audio shorter than 1 s or with no audible signal, and say why.
5. The speaker may redo an item any number of times before Submit. After Submit it is locked.
6. Results show whether each item was recorded or uploaded.

### Status

Status is derived from the time the tenth item was submitted: Pending for the first 10 s, Processing until 30 s, then Completed. It survives a refresh or a closed tab. Both durations are constants.

## 7. Scores and measurements

For each item, each category and each model:

| Value | How it is produced |
|---|---|
| Native (raw), s | Hardcoded: a seeded generator keyed by attempt, item, model and category, inside that model's range |
| Normalized, x | (s - a) / (b - a), where a and b are the lowest and highest native scores among the sample calibration speakers. This is the study's uncalibrated baseline, called Baseline in the agreement report |
| Linear | α + βx, ordinary least squares fitted on calibration speakers against y = (mean rating - 1) / 4 |
| Ridge | α + βx on the same data with a penalty λ on the slope only: β = Sxy / (Sxx + λ), α = mean y - β × mean x |

1. Fit one set of a, b, linear and ridge values for each of the nine model and category pairs. a and b use every valid calibration score. The regressions use calibration rows that have a valid score and all three ratings.
2. λ is picked from 0.001, 0.01, 0.1, 1 and 10 by the lowest MAE of clipped predictions on calibration speakers, each speaker weighted equally. A tie goes to the larger λ. This follows the study method. Because the same data fits and picks, ridge will often match linear (see open items).
3. Regressions use the unclipped x. The final normalized, linear and ridge values are clipped to 0 to 1. Native is never clipped.
4. If b equals a, the three derived values are unavailable.
5. About 1 in 30 results is marked unavailable, chosen by the same seed, so that the state can be seen.
6. Display 2 decimals. Compute with unrounded values.

Acoustic measurements are hardcoded in the same way.

| Measure | Unit | Special state |
|---|---|---|
| Speech rate | syllables per second | Unavailable |
| Average pause length | seconds | No detected pauses |
| Average pitch | Hz | Unavailable |
| Mean intensity | dB | Unavailable |

Session summary: the mean over items with a valid value, for every model, category and value (native included) and for each measurement. Show "n of 10". Show unavailable when n is 0. An item with no detected pauses does not count towards the pause mean.

## 8. Agreement report

1. Data: a fixed sample file with 25 speakers, 10 items each, native scores from the 3 models and ratings from 1 to 5 by 3 raters in each category. About 1 in 30 scores is unavailable and about 1 in 50 rows lacks a rating, so the filters have something to do. A seeded script generates it once and the file is committed. All three models get the same noise and bias settings relative to their range, so none is favoured by design. Settings are fixed before the first run and not adjusted to change the results.
2. A fixed seed puts 5 speakers (20%) in calibration and 20 in the held out set. The same calibration speakers drive participant results.
3. Rows compared: held out speakers, all three models valid for that category, all three ratings present.
4. Human reference: h = (mean rating - 1) / 4.
5. MAE: mean absolute error for each speaker, then averaged across speakers.
6. RMSE: mean squared error for each speaker, averaged across speakers, then the square root.
7. Spearman correlation: ranks across all compared items with ties averaged, for each model, category and method. Show "Undefined" if either side is constant. The three methods normally match because calibration keeps the order, apart from ties made by clipping or a negative slope.
8. Coverage: held out items with a valid score divided by all held out items, for each model and category.
9. Every view is labeled "Sample data" and says these numbers tell nothing about the real models. A note adds that Baseline is not fitted to the rating scale, so lower error after calibration is expected here. Participant attempts are not included because they have no ratings.

## 9. Errors

| Case | Behaviour |
|---|---|
| Microphone permission denied or no microphone | Explain how to allow it, and keep upload available |
| File cannot be decoded, is too large or too long | Say which limit failed and let the speaker pick another |
| Browser storage unavailable (blocked or some private modes) | Check on the sign in screen, explain, and do not allow sign in |
| Storage full when submitting an item | Keep the audio on screen, say it was not saved, allow Submit again. "Clear demo data" warns that it also erases the current session |
| Page opened over plain HTTP from another device | Say recording needs HTTPS or localhost. Upload stays available |
| Refresh or closed tab mid session | Resume at the first item not submitted. Unsubmitted audio is lost |
| Same attempt open in two tabs | A submitted item cannot be submitted again |
| Unknown attempt link, or another profile's attempt | After the sign in and consent checks, explain that this attempt is not in this profile's demo data and link to sessions |

## 10. Stack and done criteria

1. Next.js (App Router), TypeScript, Tailwind CSS and a small IndexedDB wrapper. No environment variables.
2. Calibration, summary and agreement code are pure functions with Vitest tests against hand worked examples.
3. A Playwright test covers sign in, consent, a session with a fake microphone and one upload, status reaching Completed, results and the agreement report.
4. Checked in a real browser at phone, tablet and desktop widths.
5. Interface copy uses plain words, with no dashes in front of labels.
6. Until deployment, the app runs on the demo laptop at localhost. Browsers only allow the microphone on localhost or HTTPS.

Build order: math and sample data; sign in, consent and sessions; recorder and upload; status and results; agreement report; responsive polish and the end to end test. Deploy only when asked.

## 11. Left to the builder

Visual details and layout, component choice, file layout, sample item wording (marked as samples), and the exact silence threshold.

## 12. Open items

1. Which devices run the defense walkthrough. A laptop works at localhost. Phones need an HTTPS address, which means deploying.
2. Choose the visual style before interface work starts.
3. Keep the study's way of picking λ, or switch to leaving calibration speakers out in turn.
4. Confirm the raw score scale (section 2).
5. Confirm the 30 second limit and retakes.
6. Supply the real item bank when ready. Samples are used until then.

## 13. If the demo later becomes the real portal

1. Move accounts and records to Postgres and recordings to private object storage, uploaded straight from the browser because Vercel Functions limit request bodies to 4.5 MB.
2. Run the models on a separate machine that picks up submitted jobs and posts results back. They need Kaldi, large checkpoints and ideally a GPU.
3. Show calibrated scores only after the calibration speakers have been rated and the mappings fitted.
4. Check storage limits first. Vercel's free plan includes 2,000 Blob uploads a month.
