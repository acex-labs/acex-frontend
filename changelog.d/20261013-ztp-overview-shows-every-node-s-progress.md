---
kind: added
title: ZTP Overview shows every node's progress through provisioning
refs: #16, #17
---
The ZTP Overview page was an empty placeholder. It now shows counts per stage (Awaiting device, Discovering, Awaiting approval, Ready, Provisioning, Provisioned), a "Needs attention" card for failed and stalled nodes, a backlog of unclaimed assets and a fleet coverage bar. Click a stage to filter the table; the page refreshes itself every 15 seconds.
