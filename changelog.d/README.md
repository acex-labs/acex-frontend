# Changelog fragments for the web interface

One file per change, written for the network engineers who use ACEX: what
they now see and can do on screen. Add one with your pull request; CI fails a
pull request that changes `src/`, `public/` or the container files without
one. The notes are compiled into `src/changelog.json`, which ships inside the
bundle and appears under Settings > What's new next to the backend's. A
release stamps the version and date, so never edit that file by hand.

```
python3 scripts/changelog.py new acex-frontend --kind added --title "Sites can be filtered by region"
```

gives `changelog.d/<date>-sites-can-be-filtered-by-region.md`:

```
---
kind: added
title: Sites can be filtered by region
refs: #19
---
The Sites page has a Region filter next to the search field. The choice is
kept in the address, so a filtered list can be shared.
```

- `kind`: `added`, `changed`, `fixed`, `removed`, `deprecated` or `security`.
  `internal` satisfies the check without being published, for work users
  cannot notice (refactoring, tests, a dependency bump).
- `title`: one line, at most 80 characters. Say what a user can now do or what
  looks or behaves differently, in the words the interface uses. Not the
  commit subject, not the branch name.
- The text after the front matter is the description, in Markdown. Optional,
  but the place for anything the user has to do or should know.
- Optional: `breaking: true`, `audience: admin|developer` (default `user`),
  `refs: #316, ADO-1234` (a label, optionally followed by a URL).

## Cutting a release

```
python3 scripts/changelog.py release acex-frontend --bump patch
```

bumps `package.json` and `package-lock.json`, moves the fragments into
`src/changelog.json` under the new version and today's date, and deletes them.
Commit the result. A pull request into `main` that changes the version without
releasing its fragments fails the check. Development images built from `dev`
carry pending fragments as "Not released yet".

`scripts/changelog.py` is a copy of `backend/src/acex/changelog/tool.py` in
`acex-labs/acex` (Python standard library only; run it from the repository
root). Copy it again when the original changes. The format is described in
that repository's `docs/guides/changelog.md`.
