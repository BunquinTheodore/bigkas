# bigkas web app flow

This is the planned flow. Nothing is built yet. Rules behind each step are in the [design](superpowers/specs/2026-11-26-bigkas-poc-design.md).

## 1. Whole app

```mermaid
flowchart TD
    A["Open bigkas"] --> B["Sign in with email and pick a role"]
    B -->|Researcher| R["Agreement report"]
    B -->|Participant| C{"Consent given before?"}
    C -->|No| D["Consent notice and age check"]
    D -->|Decline| B
    D -->|Agree| E["Reading sessions"]
    C -->|Yes| E
    E -->|"Start or resume"| F["Item screens, 1 to 10"]
    F -->|"Tenth item submitted"| G["Status page"]
    E -->|"Pending or Processing"| G
    G -->|"Completed"| H["Session summary"]
    E -->|"Completed"| H
    H --> I["Item results, previous and next"]
    I --> H
    H --> E
    E -->|"Sign out"| B
    R -->|"Sign out"| B
```

Sign out is available on every signed in page, not only the two shown.

## 2. One item

```mermaid
flowchart TD
    A["Show item n of 10"] --> B{"How to answer?"}
    B -->|Record| C["Record, stops at 30 s"]
    B -->|Upload| D["Choose an audio file"]
    C --> E["Convert to 16 kHz mono WAV"]
    D --> E
    E --> F{"Usable audio?"}
    F -->|"No, say why"| B
    F -->|Yes| G["Play back"]
    G -->|Redo| B
    G -->|Submit| H["Save and lock the item"]
    H --> I{"Was it item 10?"}
    I -->|No| A
    I -->|Yes| J["Mark the attempt submitted"]
```

## 3. Attempt status

```mermaid
stateDiagram-v2
    state "Not started" as NotStarted
    state "In progress" as InProgress
    [*] --> NotStarted
    NotStarted --> InProgress: Start
    InProgress --> InProgress: Submit items 1 to 9
    InProgress --> Pending: Submit item 10
    Pending --> Processing: 10 s after submit
    Processing --> Completed: 30 s after submit
    Completed --> [*]
```

## 4. Where the numbers come from

```mermaid
flowchart LR
    S["Fixed sample dataset"] --> F["Fit min, max, linear and ridge on calibration speakers"]
    S --> R["Agreement report on held out speakers"]
    F --> R
    A["Submitted attempt"] --> M["Hardcoded analysis, seeded"]
    M --> N["Native score per model and category"]
    M --> Q["Four acoustic measurements"]
    N --> C["Normalize, then linear and ridge"]
    F --> C
    C --> P["Item results and session summary"]
    Q --> P
```

The recording is stored and played back, but it does not influence any number. Every results screen says so with a Simulated label.

## 5. Pages

| Page | Path | Who |
|---|---|---|
| Sign in | `/` | Everyone |
| Consent | `/consent` | Participant |
| Reading sessions | `/sessions` | Participant |
| Item recorder | `/attempts/[attemptId]/record` | Participant |
| Status or session summary | `/attempts/[attemptId]` | Participant |
| Item results | `/attempts/[attemptId]/items/[n]` | Participant |
| Agreement report | `/research` | Researcher |

Checks run in this order: signed in with the right role, then consent, then whether the attempt belongs to this profile. A failed first or second check leads to the missing step. A failed third check shows a short explanation with a link to the sessions page.

## 6. Defense walkthrough

1. Sign in as a participant and agree to the notice.
2. Start a session. Record a few items and upload one.
3. Submit the tenth item and watch Pending become Processing, then Completed.
4. Open the summary, then one item.
5. Sign out, sign in as a researcher, open the agreement report.
