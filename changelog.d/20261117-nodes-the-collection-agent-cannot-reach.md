---
kind: added
title: Nodes the collection agent cannot reach are marked
---
The Nodes list has a Collection column and filter. A node the collection agent could not collect on its last try gets a red label with the reason: unreachable, login failed, privilege level, SSH algorithm, no driver, no IP address, no credentials or empty config. Hover the label to see since when, how many attempts in a row and the message from the agent. The same label sits next to the node's name, and the Overview tab lists when it was last collected and last tried. A node that no agent has reported on yet shows a dash.
