#!/bin/bash
# Lighthouse 12 mobile (default simulated throttling), performance only, one run per page.
D=/tmp/claude-0/-home-user/c6a80eef-b324-5bfc-8293-5b85ed53174f/scratchpad/diag/perf
mkdir -p $D/lighthouse
export CHROME_PATH=/opt/pw-browsers/chromium-1243/chrome-linux64/chrome
cd $D/tools
for p in "$@"; do
  n=$(echo "$p" | sed 's#^/##; s#/$##; s#/#_#g'); [ -z "$n" ] && n=home
  timeout 240 npx --yes lighthouse@12 "https://funeralfunds.com$p" --only-categories=performance --form-factor=mobile --output=json --output-path=$D/lighthouse/$n.json --quiet --chrome-flags="--headless=new --no-sandbox --proxy-server=$HTTPS_PROXY" > $D/lighthouse/$n.log 2>&1
  echo "$p exit=$?"
done
