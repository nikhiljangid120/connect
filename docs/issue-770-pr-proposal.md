# URL handling: shared route grammar and deep-linked drive dialogs

Refs #770

## Scope
A focused routing foundation and top-level dialog deep-linking change, not a claim that every modal/bounty requirement is complete.

- Share one device/route/range grammar between startup and history handling; support date, modern hex, and demo route IDs and zero-start ranges.
- Apply PUSH/POP/REPLACE consistently. Preserve loaded route/cache/loop/playback state when only a dialog query changes.
- Ignore stale legacy-route lookup results and replace legacy URLs rather than adding back-button loops.
- Deep-link device settings, Files, More info, Clips, drive upload queue, and dashboard date filter.
- Guard stale dialog close callbacks. Keep menu anchors and form drafts local.
- Handle public demo file URLs and malformed file lists without uncaught parsing errors.

## Tests
- 163 unit tests pass; lint, production build and diff whitespace checks pass.
- Isolated compiled-draft built-in Chromium: cold URLs, info/filter reload, Back/Forward, Escape close, state identity/offset preservation and narrow viewport exercised.
- Authenticated settings visibility used a demo-owner fixture, not a real owner account.

## Not covered
Pairing, settings-nested upload/unpair confirmation and individual clip viewer/delete confirmations remain local. Full authenticated owner/device transitions and visual/accessibility QA require additional validation. Existing compatibility helpers/actions remain; this is not a complete router rewrite.

## AI disclosure and contributor review
Implementation and tests were AI-authored/assisted. Human review of every changed line is required before submitting this proposal; it has not yet been completed. Do not submit this body with that requirement unresolved.
