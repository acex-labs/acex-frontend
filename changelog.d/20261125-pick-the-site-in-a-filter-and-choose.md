---
kind: changed
title: Pick the site in a filter, and choose whether all or any filter must match
---
The filter rows of the Config Builder, Reconcile and the Config Translator now offer the attribute as a choice (role, site, hostname or sequence), and a site filter suggests the sites that exist. When there are several filters, Match decides whether a node has to match all of them or any one; All is the default. Needs a backend with `filter_match`; an older backend ignores it and combines the filters as before.
