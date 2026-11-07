#!/usr/bin/env bash
# Installs test dependencies once, then runs the end-to-end test.
set -euo pipefail
cd "$(dirname "$0")"
python3 -m pip install --quiet playwright
python3 -m playwright install chromium >/dev/null 2>&1 || echo "Note: couldn't download Chromium; set CHROME_PATH to an installed Chrome."
if [ ! -f .vendor/alpinejs-3.14.8/package/dist/cdn.min.js ]; then
  mkdir -p .vendor && cd .vendor
  npm pack --silent alpinejs@3.14.8 @supabase/supabase-js@2.119.0 >/dev/null
  for t in *.tgz; do mkdir -p "${t%.tgz}" && tar xzf "$t" -C "${t%.tgz}" && rm "$t"; done
  cd ..
fi
python3 e2e_test.py "${1:-../website}"
