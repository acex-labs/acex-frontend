---
kind: added
title: Administrators can sync ConfigMaps from git repositories
---
Settings has a Git Repositories page, for administrators. Add a repository with its HTTPS URL, branch and the
directory that holds the ConfigMaps, and pick a token credential or paste a personal access token, which is
saved as a credential. For a git server signed by an internal CA, paste its CA certificate under Trust an internal CA. The backend loads the ConfigMaps at once and again whenever the branch moves. The page
shows each repository's status, loaded commit and ConfigMaps, and why the last sync failed; Sync now loads the
latest commit straight away.
