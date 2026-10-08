# AI-assisted review draft: Connect URL handling (#770)

Status: review branch only. Not submitted upstream; not a claim that the whole bounty is solved.
Base: 109edb39ffa7a4ad3c38788ca2f39a286538ff07 (master).

## What changed
- One pathname grammar is shared by startup, authentication and history helpers.
- Validate full device/route IDs, including date-based, modern hexadecimal and demo routes.
- Validate finite, increasing ranges; preserve zero-start URLs.
- Apply PUSH/POP/REPLACE through the same history middleware without writing another URL from Prime navigation.
- Replace legacy URLs after asynchronous lookup and ignore stale results after navigation.
- Deep-link device settings using ?settings=<deviceId>, preserving the underlying drive, other queries and hash.
- Settings render outside the drawer and stream view; owner/superuser visibility is retained.
- Preserve loaded route data/playback on modal-only URL changes, and avoid restoring stale pages when settings navigate elsewhere.

## Validation
- Original baseline: 96 tests passed.
- This branch: 131 tests passed; lint passed; production build passed; git diff --check passed.
- Real Chromium /demo and a modern drive URL rendered without uncaught page errors.
- Mounted-app Chromium check passed: opening settings preserved currentRoute/routes/loop references, paused state and offset; Back closed settings and Forward reopened it. Settings visibility used a demo-owner fixture in local Redux, not a real authenticated account.
- Image inspection was unavailable; screenshots were captured but visual QA was not completed.

## Scope and remaining work
This is a routing foundation, not completion of every major dialog requirement. Clip/upload/pairing dialogs are not all deep-linked. Existing action-driven state updates and compatibility URL helpers remain. Review all transitions and authenticated settings behavior on real accounts, plus Back/Forward, reload, auth redirects and unknown paths, before an upstream proposal.

## Your review
The AI agent wrote this implementation and tests. Read the diff, run the tests, explain each changed line and only then decide whether to submit. Do not claim independently written work or bounty completion.
