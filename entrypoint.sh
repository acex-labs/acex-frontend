#!/bin/sh
set -e

API_URL="${API_URL:-http://localhost:80}"

BRAND_PRIMARY="${BRAND_PRIMARY:-#0CA5E9}"
BRAND_PRIMARY_SOFT="${BRAND_PRIMARY_SOFT:-#24ACE3}"
BRAND_CANVAS="${BRAND_CANVAS:-#080808}"
BRAND_SURFACE="${BRAND_SURFACE:-#111111}"
BRAND_SURFACE_HI="${BRAND_SURFACE_HI:-#1A1A1A}"
BRAND_EDGE="${BRAND_EDGE:-#222222}"
BRAND_CONTENT="${BRAND_CONTENT:-#ECECEC}"
BRAND_SUBTLE="${BRAND_SUBTLE:-#555555}"

cat > /usr/share/nginx/html/config.js << EOF
window.RUNTIME_CONFIG = {
  API_URL: "$API_URL"
};
(function () {
  var s = document.documentElement.style;
  s.setProperty('--color-brand',       '$BRAND_PRIMARY');
  s.setProperty('--color-brand-soft',  '$BRAND_PRIMARY_SOFT');
  s.setProperty('--color-canvas',      '$BRAND_CANVAS');
  s.setProperty('--color-surface',     '$BRAND_SURFACE');
  s.setProperty('--color-surface-hi',  '$BRAND_SURFACE_HI');
  s.setProperty('--color-edge',        '$BRAND_EDGE');
  s.setProperty('--color-content',     '$BRAND_CONTENT');
  s.setProperty('--color-subtle',      '$BRAND_SUBTLE');
})();
EOF

exec "$@"
