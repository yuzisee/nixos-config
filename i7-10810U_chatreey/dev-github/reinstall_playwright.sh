#!/bin/sh

GIT_ROOT=$(git rev-parse --show-toplevel)
cd "$GIT_ROOT"

if sudo -n -k echo 'this is most likely a Github-hosted runner, because I am able to sudo without a password, even after -k invalidates any existing credentials (and by setting STDIN to /dev/null it is impossible to enter another password)' < /dev/null; then
  cd i7-10810U_chatreey/app_courtreserve_com

  npm ci # requires that we already `npm init playwright@1.56.0` at some point
  npx --no-install playwright install chromium
else
  exit 69 # EX_UNAVAILABLE
fi
