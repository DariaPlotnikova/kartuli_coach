# Kartuli Practice — MVP Contract

## 1. Product direction

Kartuli Practice is a very small, mobile-first Georgian-language practice coach.

The MVP is an individual, browser-only application. A learner selects topics and the app creates a short randomized training from exercises loaded from JSON files. The learner reveals reference answers, marks the result of each exercise, and sees lightweight progress based on data stored in the local browser.

The product is intentionally calm and low-friction: no account, server, grading backend, social feed, group communication, publishing, or deadlines in the MVP.

The existing mockup remains the visual reference for spacing, typography, cards, controls, animations, screen transitions, dark mode, and mobile touch behavior. Its collaborative features are out of MVP scope.

## 2. MVP deliverable

Create:

```text
kartuli/
├── simple_kartuli.html
└── exercises/
    ├── exercises_batch_1.json
    ├── exercises_batch_2.json
    └── ...
```

`simple_kartuli.html` is the application entry point and must work when served as a static file from GitHub Pages. Exercise content is loaded at runtime from the `exercises/` directory using relative URLs.

The first implementation may keep CSS and JavaScript inside `simple_kartuli.html` to preserve the single-file MVP requirement. Exercise data must remain external JSON.

## 3. Exercise data contract

Each batch file contains a JSON array of exercise objects:

```json
[
  {
    "id": "550e8400-e29b-41d4-a716-446655440000",
    "task": "Переведи на грузинский",
    "task_phrase": "Я иду домой",
    "answers": ["მე სახლში მივდივარ."],
    "themes": ["movement", "present", "basic"]
  }
]
```

Required fields:

- `id`: valid UUID string, globally unique across all batch files and stable between releases. The UUID must have no semantic relationship to a topic, theme, batch, or exercise wording.
- `task`: instruction describing what the learner should do, for example `Переведи на грузинский`.
- `task_phrase`: optional phrase or sentence that the learner should transform. When present, the UI shows `task` as the instruction and `task_phrase` as the main exercise text. Older records may omit it; then `task` itself is displayed as the exercise text.
- `answers`: non-empty array of one or more reference Georgian answers. The first item is the preferred/default answer; additional items are valid alternatives or answer parts where the exercise needs more than one answer field.
- `themes`: non-empty array of one or more stable theme identifiers.
- `difficulty`: optional numeric difficulty level retained for future filtering and display.

Theme identifiers are lowercase, concise, and machine-readable. An exercise may belong to multiple themes. Batch files are maintenance chunks only; they must not imply a one-file-per-theme structure.

The loader must:

- Load all configured batch files.
- Validate the required fields and ignore or report malformed exercises without breaking the whole app.
- Deduplicate exercises by `id`.
- Preserve the exercise `id` as the identity used by progress tracking.
- Treat an exercise as matching a selected theme when that theme exists in its `themes` array.
- Display all answer values in `answers` in a clear, intentional order; do not assume that only one answer exists.
- When `task_phrase` exists, display it as the exercise phrase beneath the instruction in `task`.

## 4. Training generation contract

The learner can:

- Select one or more themes.
- Select a training size from the available presets and/or stepper control.
- Start a training from the matching exercise pool.

Generation behavior:

- Filter exercises by intersection with the selected themes.
- Shuffle the filtered pool randomly.
- Select up to the requested number of exercises; never create empty or duplicate exercise entries.
- If fewer exercises are available than requested, use all available matching exercises and clearly communicate the actual count.
- Avoid repeating the same exercise within one training.
- Preserve the generated exercise order for the current training session.

The MVP does not need spaced repetition or a sophisticated recommendation algorithm. A later version may prefer unseen or weak exercises while keeping the same exercise contract.

## 5. Training experience

The core screen flow is:

1. Home/progress screen.
2. Theme and training-size selection.
3. One exercise at a time.
4. Learner reveals the reference answer.
5. Learner records a simple result for the exercise.
6. Training completion summary.

The learner must be able to:

- See current position and progress bar.
- Reveal and hide the reference answer.
- Mark an exercise as understood/correct or needs practice/incorrect.
- Move forward and backward where this does not lose recorded input.
- Finish a training even when an exercise is skipped, if skipping is supported by the final UX.
- Restart or return home after completion.

An active training is interruptible. Leaving the training, closing the page, navigating to the home screen, or temporarily losing focus must not discard it. When an active training is incomplete, the home screen must show a prominent `Незавершённая тренировка` entry linked to the paused training. Selecting it resumes at the last unfinished exercise with the current answers/results preserved.

Only one active training needs to be supported in the MVP. Starting a new training while another one is paused must either resume the existing one first or explicitly replace it after confirmation; it must never silently lose the paused training.

The MVP does not require free-text answer evaluation. Text comparison is not treated as automatic correctness; the learner makes the final judgment.

## 6. Progress meanings

The product has two separate meanings of progress and they must not be presented as one metric.

### 6.1 Current training progress

This is session progress for the selected training:

- Current exercise position, for example `3 / 10`.
- Completed/answered/skipped state for each exercise in that training.
- Current answers and learner results needed to resume it.
- A paused-training entry on the home screen until the training is completed or deliberately discarded.

### 6.2 Overall exercise progress

This is learner progress across the complete loaded exercise bank:

- Count of unique exercise UUIDs attempted or completed.
- Total number of valid loaded exercises.
- Percentage based on unique exercises, not number of attempts and not number of generated trainings.
- Topic progress may be shown separately, but it must not replace the overall exercise metric.

When the overall unique-exercise progress reaches at least 90%, show a persistent, visible call to action on the home/progress screen:

`Вы прошли почти все задания. Напишите в tg, чтобы расширить набор заданий`

The CTA may also appear as a toast when the threshold is first crossed, but it must remain visible afterward until the exercise bank grows or the user dismisses it. Adding new JSON exercises should naturally lower the percentage if the learner has not attempted them.

## 7. Local storage contract

All persistence is local to the current browser and origin using `localStorage`. No learner data is sent to a server.

Use one namespaced storage key, for example:

```text
kartuli.practice.v1
```

The stored value must be versioned and contain only serializable data. Minimum shape:

```json
{
  "version": 1,
  "exercises": {
    "550e8400-e29b-41d4-a716-446655440000": {
      "attempts": 2,
      "correct": 1,
      "incorrect": 1,
      "lastAttemptAt": "2026-09-19T12:00:00.000Z"
    }
  },
  "themes": {
    "movement": {
      "attempts": 2,
      "lastAttemptAt": "2026-09-19T12:00:00.000Z"
    }
  },
  "trainings": {
    "completed": 3,
    "lastCompletedAt": "2026-09-19T12:00:00.000Z",
    "active": {
      "id": "training-uuid-or-local-session-id",
      "exerciseIds": [
        "550e8400-e29b-41d4-a716-446655440000"
      ],
      "position": 0,
      "answers": {},
      "results": {},
      "startedAt": "2026-09-19T12:00:00.000Z",
      "updatedAt": "2026-09-19T12:00:00.000Z"
    }
  },
  "settings": {
    "theme": "light"
  }
}
```

Implementation rules:

- Write progress after each completed exercise or at the latest when the training is completed.
- Persist the active training after every meaningful change, including current position, entered answers, revealed answers, and result selections.
- Update exercise counters using the stable UUID `id`.
- Update every theme attached to an exercised exercise, not only the theme used to generate the training.
- Count overall exercise progress by unique exercise UUIDs with at least one completed result, according to the agreed completion definition.
- Keep an incomplete active training until it is completed or explicitly discarded.
- Treat missing, invalid, or old storage data as empty progress rather than crashing.
- Keep storage operations behind small functions so a future account/sync layer can replace them.
- Do not store the full exercise bank in local storage.

The app must show both current-training progress and overall unique-exercise progress. It must also show the 90% enrichment CTA described above when applicable.

## 7. Loading and failure behavior

The app must show an explicit loading state while exercise files are being fetched.

It must show a readable recovery state when:

- A JSON file cannot be loaded.
- The JSON is malformed.
- No valid exercises are available.
- Selected themes have no matching exercises.
- Browser storage is unavailable or full.

The rest of the interface should remain usable where possible. Errors must not silently produce a blank screen.

## 8. Visual and interaction contract

Use the mockup as the reference for:

- Mobile-first layout with a narrow readable content width.
- Large touch targets and comfortable vertical spacing.
- Rounded cards, soft borders, muted secondary text, and lavender accent color.
- Light and dark themes.
- Fixed mobile navigation only where it benefits the simplified flow.
- Short screen-entry, answer-reveal, progress, and completion animations.
- `prefers-reduced-motion` support.
- Georgian-capable font fallbacks.

The simplified MVP should remove mockup elements that imply collaboration: author names, participants, group names, publishing, shared feed, answer discussions, and peer comparison.

## 9. Milestones

### Milestone 1 — Contract and content foundation

- Approve this contract.
- Add the first exercise batch using the multi-theme schema.
- Define the configured list of batch files.
- Verify unique IDs, valid themes, and valid JSON.

### Milestone 2 — Static app shell

- Create `simple_kartuli.html`.
- Reproduce the agreed visual language from the mockup.
- Implement loading, error, empty, home, setup, exercise, and completion states.
- Add responsive mobile layout, theme toggle, and reduced-motion behavior.

### Milestone 3 — Exercise loading and generation

- Fetch all configured JSON batches with relative paths.
- Validate and merge exercises.
- Display available themes.
- Filter by multi-theme membership, shuffle, and create a training.
- Handle insufficient or empty pools.

### Milestone 4 — Interruptible training and persistence

- Implement answer reveal and learner result controls.
- Save active-training state, exercise results, theme progress, and completed-training history to versioned `localStorage`.
- Restore an interrupted training after reload or return from the home screen.
- Show a `Незавершённая тренировка` entry for a paused training.
- Restore progress after reload.
- Display current-training progress and overall unique-exercise progress separately.
- Show the persistent 90% enrichment CTA.

### Milestone 5 — Static hosting verification

- Test from a local HTTP server, not only by opening the file directly.
- Verify relative JSON paths from the GitHub Pages project path.
- Verify mobile viewport behavior, refresh persistence, empty/error states, and a clean first visit.

## 10. Future compatibility boundary

The MVP must not implement collaboration, but its boundaries should allow it later:

- Stable exercise IDs must never be regenerated from array positions.
- Exercise IDs are UUIDs with no topic semantics.
- The answer contract supports multiple reference answers without changing the exercise identity.
- Exercise content and learner progress must remain separate.
- Local storage access must be isolated behind persistence functions.
- Training records should conceptually remain separate from the exercise bank.
- Theme identifiers and exercise tags should remain stable once published.

Future collaboration may add user identity, shared training records, contributions, synchronization, and moderation without changing the basic exercise object or requiring theme-specific files.

## 11. Explicitly out of scope for MVP

- User accounts or authentication.
- Group/name setup.
- Shared feed.
- Publishing or importing user-created practices.
- Comments or discussions.
- Backend APIs or databases.
- Automatic answer grading.
- Spaced repetition algorithm.
- Server-side analytics.
- Framework or build pipeline.
