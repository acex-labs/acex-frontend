---
kind: added
title: Set a webhook secret on a git repository
audience: admin
---
The form for a git repository under Settings > Git Repositories now has a Webhook secret. Choose a secret that exists, or make a new one (Generate gives a long random one), and put the same secret in the git host: GitLab's Secret token or GitHub's Secret. The git host then tells ACEX at once when the branch has a new commit, instead of ACEX finding out at the next check. The address for the git host to call is shown when you edit the repository and in its details. Before, this could only be set through the API.
