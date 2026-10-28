---
kind: added
title: Apply a path of the configuration to selected nodes from a reviewed plan
---

Operations > Run > Apply: give a path such as `system.ntp.servers`, or none for the whole tree, and render a plan. Every chosen node is read live and the nodes are grouped by the patch they would get, with what each patch adds, changes and removes. Choose groups and nodes and apply: a node that renders another patch by then is left as it is, and every patched node is read again to verify. With prune, config at the path that the desired configuration doesn't declare is removed too.
