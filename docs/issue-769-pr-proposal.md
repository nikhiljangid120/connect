# Playback: use observed media time and explicit seek commands

Refs #769

## Scope
A media-driven playback proposal, not a claim of complete cross-platform/bounty acceptance.

- Use the attached media element's time for the timeline/map; report native media events to Redux.
- Apply explicit seek revisions, including repeated seek targets; remove polling/corrective seek/rate synchronization hacks.
- Keep media mounted during Map view and release listeners, animation frame and clock ownership on detach.
- Freeze fallback time after fatal errors, preserving intent/offset for Retry.
- Reset stale autoplay/error state on route/credential changes.
- Read early HLS audio metadata and subscribe to later codec discovery.

## Tests
- 118 unit tests pass; lint, production build and diff whitespace checks pass.
- Desktop Chromium: public demo playback, pause, seek, Map identity; injected 404 and attached fatal callback recover with Retry and do not advance the failed timeline.
- Synthetic H.264/AAC HLS: audio control enabled, native unmuting, playback and pause verified. No sound-quality measurement.

## Required validation before full acceptance
Real iOS Safari / Android Chrome / installed PWAs; desktop Safari/Firefox; actual driving audio, real credential changes, missing middle segments and real offline recovery. Mocking/fault injection and narrow viewport testing are not substitutes for these checks. No unmeasured performance claim.

## AI disclosure and contributor review
Implementation and tests were AI-authored/assisted. Human review of every changed line is required before submitting this proposal; it has not yet been completed. Do not submit this body with that requirement unresolved.
