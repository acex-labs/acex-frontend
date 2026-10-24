---
kind: added
title: Bulk Actions: run commands and ping on many nodes from Operations
---
Operations > Bulk Actions has two kinds of action. Exec Commands runs raw commands on the nodes you choose, after you confirm by typing what will run. Standard Actions are vendor-agnostic methods that take the same parameters and give the same result on every device, starting with ping (target, count, timeout, VRF, source interface and packet size). The nodes you choose stay chosen when you switch between them; only nodes whose driver supports the action can be chosen, and any that can't run it are skipped. Each run is listed with its progress; open it to see every node's response, and download the report as CSV or JSON.
