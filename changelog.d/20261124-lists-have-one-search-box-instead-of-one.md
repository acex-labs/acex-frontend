---
kind: changed
title: Lists have one search box instead of one for each field
---
The lists of nodes, logical nodes, sites, regions, contacts and assets have a single search box where there used to be one box for each field. Type part of what you know and the list shows every row that contains it, in any of these fields:

- Nodes: hostname, IP address, serial number, hardware model, vendor, site and role. A number also finds the node with that ID.
- Logical nodes: hostname, site and role. A number also finds the logical node with that ID.
- Sites: name, display name, city, country and address.
- Regions: name and display name.
- Contacts: name, first and family name, email and phone.
- Assets: serial number, vendor, hardware model, operating system and its version, and driver.

Hover over the box, or click into it while it is empty, to see which fields it looks in. The dropdowns stay for what has a fixed set of values: the region on Nodes, Logical nodes and Sites, and the status choices on Nodes. The search and the dropdowns work together, and the box on Compliance > Software looks the same as the others.

The same search box is in the node list of Operations > Run, replacing its hostname, site, region and vendor boxes, and in Change Asset on a node, replacing vendor, model and serial number. Links and bookmarks that filter on one of the old fields, such as `?hostname=core-1`, still work: the text is put in the search box.
