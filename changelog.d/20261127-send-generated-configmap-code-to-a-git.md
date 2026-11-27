---
kind: added
title: Send generated ConfigMap code to a git repository as a merge request
---
The code that the Config Translator, the Builder and Reconcile generate now has Create merge request next to Copy. Choose the git repository, the folder and a file name, and ACEX opens a merge request on GitLab with the file on a new branch; you get the link to it. Nothing changes on the branch that ACEX reads, or on any device, until the merge request is merged. The folder can be any folder of the repository or a new one: the dialog says which git repository and site read the folder, and warns when none does. A file that is already there is only replaced if you say so. A repository takes merge requests once it has a Merge request token, a GitLab token with the scope api and at least the role Developer, set in its form under Settings > Git Repositories.
