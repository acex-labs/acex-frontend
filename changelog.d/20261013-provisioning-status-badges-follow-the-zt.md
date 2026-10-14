---
kind: changed
title: Provisioning status badges follow the ZTP stages
refs: #16, #17
---
Provisioning status badges now use ZTP stage names (enrolled, awaiting device, awaiting approval, ready, provisioning, provisioned, failed) with underscores shown as spaces, and "ready" is blue. The old "pending" and "bootstrapping" values are no longer listed. Which statuses a node can have is decided by the backend.
