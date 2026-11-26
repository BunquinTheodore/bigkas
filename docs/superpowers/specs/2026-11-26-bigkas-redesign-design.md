# bigkas redesign: calm depth

Date: 26 November 2026. Status: approved on 26 November 2026, built on 27 November 2026.

This builds on the [original design](2026-11-26-bigkas-poc-design.md). It replaces parts of its section 5 only where this document says so. Everything about data, scoring and flows stays as it is.

## 1. Intent

The request: improve the interface, design and layout with three.js, shadows and similar touches, and make it user friendly.

Assumed reason (stated to the owner and not corrected): the portal should impress at the thesis defense and feel simple to general participants, who are not developers.

## 2. Goals, non goals, anti goals

Goals

1. The portal looks richer and has a clear sense of depth, in light and dark.
2. A first time participant knows what to do on each screen without being told.
3. One 3D element, a voice orb, that reacts to the real microphone.

Non goals

1. New pages, new data, new scoring, a server, or a new item bank.
2. 3D charts or 3D scores.
3. A brand logo.

Anti goals, which count as failure even if everything runs

1. Anything 3D that looks like analysis or grading. The orb never changes with the quality of speech.
2. Moving graphics behind text, tables or scores.
3. The first screen becoming slower to use.
4. A broken or empty screen on a device without 3D support.
5. Motion when the device asks for reduced motion.
6. A loss of contrast, shared edges, touch target size or keyboard behaviour that works today.

## 3. Approaches

| Approach | What it is | Strength | Cost |
|---|---|---|---|
| A. Calm depth (chosen) | Today's Apple style with layered shadows, soft gradients, smoother motion and one 3D voice orb | Richer, still easy to read, keeps the approved look | About 130 kB of extra code on the two screens with the orb |
| B. Immersive | Dark glass panels over a moving 3D sound wave | Most dramatic | Scores harder to read, heavy on phones, replaces the approved look |
| C. Polish without 3D | Shadows, layout and guidance in CSS only | Lightest and most reliable | Does not meet the three.js request |

The owner chose A.

## 4. Decided by the owner

1. Approach A: the current Apple style with layered shadows, soft gradients and smoother motion.
2. A 3D voice orb that moves with the real microphone while recording, and a quiet version on sign in.
3. Scores stay flat and readable.
4. A Read, Record, Submit guide.
5. Loading placeholders instead of blank screens.
6. Plain explanations of the score columns.
7. A record button that needs no scrolling on a phone held sideways. Today it does at 740 by 360.
8. three.js loads only where it appears.
9. Reading items are general everyday English. This is already done and not part of this build.

## 5. Design (proposed by the builder)

### Surfaces and depth

1. Three elevation levels held as colour tokens: resting card, raised (hover, primary button, selected segment) and floating (top bar). Soft two layer shadows.
2. Shadows barely show on black, so dark mode adds a faint 1 px light edge on cards.
3. A still, very soft wash of blue into violet behind the page, strongest at the top. No blur or glass behind tables or scores. Text keeps a 4.5 to 1 contrast over the strongest part.
4. The 20 px card radius, the 1080 px container, spacing steps and breakpoints stay.

### Motion

1. Page content fades and rises 8 px once when it appears, within 250 ms.
2. Cards that can be opened lift 2 px on hover, only on devices with a pointer.
3. Buttons keep the press effect. Everything stops with reduced motion.

### Voice orb

A softly rippling sphere in blue to violet, drawn with three.js. It is decoration: hidden from screen readers, with the button, timer and status text carrying all meaning.

| State | Orb |
|---|---|
| Ready, and on sign in | Slow breathing |
| Recording | Surface moves with the current microphone loudness |
| Checking the audio | Gentle turning |
| Answer ready, or microphone unavailable | Settled and still apart from breathing |

1. On the record card it takes the place of the bar meter, about 180 px square. On sign in it sits above the title, about 120 px.
2. It reads the loudness the recorder already provides. It opens no second microphone stream and changes nothing about the recorded audio.
3. Fallback when 3D is unsupported, fails to load, or reduced motion is on: the record card shows today's bar meter and sign in shows a still gradient circle. The fallback is also what shows while the 3D code loads, so nothing jumps.
4. The 3D code is a separate download that starts after the page is usable, at most 150 kB compressed (a sample bundle measured about 132 kB).
5. It pauses when the page is hidden or the orb is off screen, caps the pixel ratio at 2, draws one orb at a time and releases the graphics context on leaving.
6. Plain three.js, pinned to 0.187.0 with its types. No React wrapper library, since there is one object.

### Screens

Sign in

```
            (orb)
           bigkas
  Calibrated read aloud speech scoring
  Email
  [                              ]
  [ Participant ]  [ Researcher ]
  Records answers.  (one line that follows the chosen role)
  [          Continue            ]
         Clear demo data
```

Reading sessions: each card shows its status and a progress bar of submitted items. The session to continue, or else the first not started, has the one filled button.

Record, wide

```
Item 3 of 10                                   Sentence
[progress                                             ]
(1 Read)  (2 Record)  (3 Submit)
[                              ] [        (orb)        ]
[   "Text to read"             ] [     record button   ]
[                              ] [     0:00 / 0:30     ]
[                              ] [ Tap to start        ]
[                              ] [ Upload audio file   ]
```

1. The guide highlights Read and Record while ready, Record while recording, Submit when an answer is ready. The current step is marked by more than colour and is read to screen readers.
2. The hint under the button reads "Tap to start", then "Tap to stop".
3. On a short and wide screen (height under 500 px and width from 640 px) the text card and recording card sit side by side, spacing tightens and the orb shrinks, so the record button is fully visible at 740 by 360 without scrolling.
4. On a phone held upright the record button stays visible without scrolling at 390 by 667, as today.

Waiting: a progress bar runs from the tenth submit to completion, with the Simulated label.

Results: the same table and tiles with the new surfaces. A closed "What do these numbers mean?" row under the category control opens plain definitions:

1. Native: the score on the model's own scale.
2. Normalized: where that score falls between the lowest and highest sample calibration scores, from 0 to 1.
3. Linear and Ridge: the normalized score adjusted to the human rating scale by regression, from 0 to 1.
4. Speech rate, average pause length, average pitch and mean intensity, each with its unit.
5. All values are simulated.

Agreement report: the same structure, with the same kind of row explaining Baseline, MAE, RMSE, Spearman and Coverage.

Loading: grey placeholders in the shape of the coming page replace today's blank screens while the sign in check, an attempt or results load. They only appear if loading takes more than 150 ms.

Missing session, read error, not found and consent keep their layout with the new surfaces. Each screen sets its own tab title, such as "Reading sessions, bigkas".

## 6. Constraints

1. Plain labels with no dashes or decorative lines in front, no hyphenated or cut words, matching edges and widths between neighbours.
2. The Simulated and Sample data labels stay on every view that shows numbers. No coaching, grading or praise.
3. No environment variables, no external requests, nothing sent anywhere.
4. Touch targets at least 44 px, visible keyboard focus, and the focus and tab order behaviour fixed during QA.
5. Nothing is committed, pushed or deployed until the owner asks.

## 7. Done when

1. All current unit and browser tests pass.
2. New browser tests cover: the fallback without 3D support, reduced motion, the record button in view at 740 by 360 and 390 by 667, the step guide in each state, loading placeholders, the explanation rows, and page titles.
3. No sideways scroll or clipped text at 320, 360, 390, 834, 1280 and 1440 px, with readable contrast in both themes.
4. The 3D download is within its budget and is not requested on screens without an orb.
5. No console errors, screenshots reviewed at phone, tablet and desktop widths, and the screens without audio checked in Safari's engine.
6. The owner records one answer on a real iPhone and a real Android phone.

## 8. Left to the builder

Shadow and gradient values, the orb's shader and movement, wording within the rules above, component and file layout, and the shape of the placeholders.
