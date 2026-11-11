---
kind: fixed
title: Site compliance shows nodes without a collected configuration as not collected
refs: acex#368
---
The Compliance card on a site and the Compliance tab read their figures from the new compliance API. A node whose
configuration has not been collected is listed as not collected, with dashes instead of counts, and is left out of
the site's percentage. Before, it was shown as having no desired configuration.
