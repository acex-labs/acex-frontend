---
kind: added
title: Apply a path of the configuration to selected nodes from a reviewed plan
---

Operations > Run > Apply: check what to patch in a tree of the configuration, from the whole of it down to a single attribute, and render a plan. Beside the tree, a chosen node's desired configuration lights the lines the scope covers, and parts no driver of the chosen nodes can write are faded. Every chosen node is read live and the nodes are grouped by the patch they would get, with what each patch adds, changes and removes, and what their driver can't write. Choose groups and nodes and apply: a node that renders another patch by then is left as it is, and every patched node is read again to verify. With prune, config at the path that the desired configuration doesn't declare is removed too.
