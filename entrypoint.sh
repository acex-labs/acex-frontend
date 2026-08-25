#!/bin/sh
set -e

API_URL="${API_URL:-http://localhost:80}"

BRAND_RULE=""
if [ -n "$BRAND_PRIMARY" ]; then
  BRAND_RULE="$BRAND_RULE  --brand: $BRAND_PRIMARY;"
fi
if [ -n "$BRAND_PRIMARY_SOFT" ]; then
  BRAND_RULE="$BRAND_RULE  --brand-soft: $BRAND_PRIMARY_SOFT;"
fi

BRAND_SCRIPT=""
if [ -n "$BRAND_RULE" ]; then
  BRAND_SCRIPT="
(function () {
  // Inject a high-specificity rule so the brand accent overrides both the
  // default (dark) theme and the :root.light theme, without relying on
  // inline styles or load order.
  var el = document.createElement('style');
  el.textContent = ':root, :root.light {' + '$BRAND_RULE' + ' }';
  document.head.appendChild(el);
})();"
fi

cat > /usr/share/nginx/html/config.js << EOF
window.RUNTIME_CONFIG = {
  API_URL: "$API_URL"
};
$BRAND_SCRIPT
EOF

exec "$@"
