# Connect contribution review guide

## What is Connect?
Connect is openpilot's web/mobile companion: browse recorded drives, watch camera video, see maps/timelines, and manage devices/files. We changed this companion app, not openpilot's driving controls.

## What problem did the URL draft solve?
The old page parser was split across helpers, and many dialogs existed only as local component booleans. A shared link or reload could lose the dialog, and history events could reset loaded drive state.

New flow:
1. A UI click dispatches `openDialog(name)`.
2. The action reads the current location and adds `?dialog=name` without discarding the route, sharing arguments or fragment.
3. Browser history updates Redux router state.
4. The middleware derives device/route/range changes, but leaves existing drive data alone when those values are unchanged.
5. The component reads `dialogForLocation(location)` to decide what is visible. Browser Back/Forward/reload uses the same logic.

Settings use `?settings=<deviceId>` and retain owner/superuser visibility checks. Files/info/clips/uploads are valid only on a drive; filter is valid only on a dashboard/demo page. Unknown or wrong-context dialogs are ignored. Menu anchors and unsaved form fields remain component state because they are not shareable navigation state.

A stale close callback is dangerous: if Files finishes a callback after navigation to another page, blindly restoring the old URL would undo the user's navigation. `closeDialog(name)` checks the current location before changing it.

The demo Files fix reads the segment directory of each asset URL. A demo route has a synthetic ID, while its files point to a real public route; splitting by the synthetic ID previously threw an error. Invalid URLs/directories/file lists are ignored rather than producing NaN filenames or uncaught errors.

## What problem did the playback draft solve?
Video and a separate wall clock could disagree. Corrective polling/seeks tried to force video to match Redux time, making seeks/buffering fragile.

New flow:
1. On player readiness, attach the actual native video as the route's clock.
2. Timeline/map read `video.currentTime` plus the route's video-start offset.
3. Native time/seek/buffer events report observations to Redux.
4. User seeks increment a command revision. The player performs a seek only for that command, not for normal observation updates.
5. Map view keeps video mounted. Route/source changes and unmount remove listeners and ownership.

On fatal failure, release the media clock but explicitly freeze the fallback clock. Otherwise the old wall clock would keep moving behind the error. Retry remounts the player at the preserved offset. Blocked autoplay uses a direct play call during the Retry click because mobile browsers require a user gesture.

HLS may discover audio before `onReady`. We read existing track/codec metadata and subscribe to later changes, so the Unmute control is not permanently disabled just because an earlier event was missed.

## What the tests do—and do not—prove
URL: 163 tests plus desktop browser cold links, reload, Back/Forward, Escape and state preservation. Playback: 118 tests plus real desktop HLS media and controlled failure injection. Synthetic audio is not real driving-audio/iOS/PWA validation. No visual inspection or full authenticated-device testing has been completed.

## Your review checklist
- Read every changed line in the linked branch diffs, including tests—not only this guide.
- Be able to trace a click, URL update, history event, derived state and component render.
- Explain milliseconds vs seconds and the route video-start offset.
- Understand the fatal-error clock freeze and why repeated seek targets need a revision.
- Run the tests and manually exercise the UI controls.
- Describe the remaining limitations honestly. Do not claim independent authorship: the AI wrote these changes.

Only after this review should an upstream PR be opened. Use `Refs #769` / `Refs #770`, not `Fixes`, while acceptance scope remains incomplete.
