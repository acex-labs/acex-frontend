#!/bin/sh
set -e

API_URL="${API_URL:-http://localhost:80}"

BRAND_LINES=""
if [ -n "$BRAND_PRIMARY" ]; then
  BRAND_LINES="$BRAND_LINES
  s.setProperty('--brand', '$BRAND_PRIMARY');"
fi
if [ -n "$BRAND_PRIMARY_SOFT" ]; then
  BRAND_LINES="$BRAND_LINES
  s.setProperty('--brand-soft', '$BRAND_PRIMARY_SOFT');"
fi

cat > /usr/share/nginx/html/config.js << EOF
window.RUNTIME_CONFIG = {
  API_URL: "$API_URL"
};
(function () {
  // Brand accent can be overridden at runtime via BRAND_PRIMARY /
  // BRAND_PRIMARY_SOFT env vars. Surface/text colors are intentionally NOT
  // set here — they are controlled by the light/dark theme (ThemeContext).
  var s = document.documentElement.style;$BRAND_LINES
})();
EOF

exec "$@"
