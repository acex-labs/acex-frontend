---
kind: fixed
audience: admin
title: Reading a login in the clear says why it is not shown when the API refuses it
---
On Settings > Credentials, Reveal and Copy to clipboard did nothing when the API would not hand over the login. They now show a message under the credential name. A 403 says that you are not allowed to read a login in the clear and names the roles the API asks for (`acex-admin` or `acex-service`, when the backend runs with `ACEX_AUTHZ_MODE=enforce`); other answers say that the session has ended, that the credential no longer exists, or that the login could not be read.
