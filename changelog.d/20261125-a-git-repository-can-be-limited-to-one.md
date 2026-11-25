---
kind: added
title: A git repository can be limited to one site
---
Add Repository and Edit have a Site field that suggests the sites that exist. Set, the ConfigMaps in the repository apply to the logical nodes of that site only, so each site can work from a repository of its own. The list has a Site column, and the detail panel names the site. Clearing the field takes the limit away. Needs a backend that has the site on git repositories; an older backend ignores the field.
