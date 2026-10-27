---
kind: added
title: Build workflows on a canvas and follow their runs
---
Operations > Workflows lists your workflows and every run. A workflow opens on a canvas between Start and End.

**Building a workflow**

- **Add step** places a box of the kind you choose:
  - Execute: raw commands
  - Action: ping from the node
  - Probe: ping from ACEX
  - Compute
  - Assert
  - Condition, with a true side and a false side
  - Wait
- Clicking a box opens it. There you fill in what it does, pick its nodes as in Bulk Actions, and name the
  artifacts it leaves, for example `version = regex(result.output, "Version (\S+)")`.
- Later steps use an artifact by its name, for example `show interface {iface}` or
  `percent(reachable) >= 95`. A click on an artifact from an earlier step puts its name where your cursor is.
- Boxes show what keeps them from running. Loops with no way out or no wait get a warning, and **Max rounds**
  stops a loop that runs away.

**Running it**

- **Run** goes straight through.
- **Evaluate** pauses after each step, so you can check its results before you continue.
- **Dry run** shows what each step would send without reaching any device.

A workflow with execute steps asks you to type "execute" and its name before it runs.

**Following a run**

A run shows each step's state on the canvas, which side a condition took, when a wait ends, and every round
of a step that loops.

- **Artifacts:** the list of steps opens to each round's artifacts, in a table with a row per node and a column
  per artifact. A cell opens to its whole value.
- **What each step did:** you see what each node answered.
- **Failed checks:** a failed assert shows what each check read on the nodes where it failed, and a condition
  shows what it read to choose its side.

A run can be stopped while it runs and deleted once it has finished.
