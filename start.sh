#!/usr/bin/env bash
set -e
cd "$(dirname "$0")"
( sleep 1; command -v xdg-open >/dev/null && xdg-open http://localhost:3000 >/dev/null 2>&1 || true ) &
node server.js
