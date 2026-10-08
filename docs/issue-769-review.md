# AI-assisted review draft: Connect media-driven playback (#769)

Status: review branch only. Not submitted upstream; not a claim of complete cross-platform/bounty acceptance.
Base: 109edb39ffa7a4ad3c38788ca2f39a286538ff07 (master).

## What changed
- While media is attached, timeline/map/time display read real video.currentTime plus the route video-start offset.
- Native timeupdate/seeking/seeked/canplay/playing events report observed media state.
- Explicit seeks carry a revision, so even repeated seek targets are applied as commands.
- Remove the 500ms synchronization loop, debounce, repeated corrective seeks and playback-rate nudges.
- Keep video mounted when switching to Map, clean up media listeners/frame callbacks and clock ownership on detach.
- Add delayed loading feedback, fatal-error Retry, recoverable HLS handling and a direct user-gesture play retry for blocked autoplay.
- Loop against observed media time; pass the initial requested offset to HLS loading.

## Validation
- Original baseline: 96 tests passed.
- This branch: 113 tests passed; lint passed; production build passed; git diff --check passed.
- Real public demo playback in desktop Chromium: video loaded and played, media/timeline offsets differed only by the expected route video-start offset, pause stayed paused, seek reached the requested 15s route time, Map kept the same DOM video, and a 390px viewport had no horizontal overflow.
- Unit regressions cover clock ownership, cleanup, explicit/repeated seeks, stale route events, nonfatal/fatal errors, autoplay, repeated readiness, zero-start loops and buffering intent.
- Captured screenshots could not be visually inspected.

## Mandatory remaining validation
Real iOS Safari, iOS installed PWA, Android Chrome, Android installed PWA, desktop Safari/Firefox, real audio tracks, source/credential changes, missing middle segments and offline recovery. A narrow viewport is not mobile OS/PWA validation. Recoverable HLS errors rely on the existing player engine; fatal Retry coverage is currently mocked. Map/error fallback still uses the existing clock when video ownership is detached. No measured latency improvement is claimed.

## Your review
The AI agent wrote this implementation and tests. Read every line, run tests and manually exercise the controls before submission. Understand event ownership, offsets, retry behavior and remaining limitations. Do not claim independently written work or bounty completion.
