---
kind: added
title: SamruAI section in the sidebar when the backend names a SamruAI service
audience: admin
---
When the ACEX backend has `ACEX_SERVICES_SAMRUAI_URL` set, a SamruAI section
appears in the sidebar. Its Overview page shows whether SamruAI is reachable
and whether it accepts your login. The web interface learns the address from
the backend at startup, so nothing about SamruAI is configured on the web
interface itself. SamruAI is called with the same Keycloak token as ACEX, so it
must trust the same realm and accept the token's audience. Without the setting
nothing changes.
