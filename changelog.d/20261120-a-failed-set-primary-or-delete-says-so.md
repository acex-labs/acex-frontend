---
kind: fixed
title: A failed Set primary or delete on a management connection says so
---
On a node's Management Connections card, Set primary and the delete button did nothing visible when the server refused the change. The card now shows "Failed to set the primary connection." or "Failed to delete the connection." above the list. Set primary itself needs the backend route that changes a connection; until the backend has it, the message is what you see.
