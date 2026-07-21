#!/usr/bin/env bash
set -euo pipefail
root="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$root"
[[ -f .env ]] || { echo "Missing .env; copy .env.example." >&2; exit 1; }
[[ -d server/node_modules && -d client/node_modules ]] || { echo "Run ./scripts/bootstrap.sh first." >&2; exit 1; }
set -a; source .env; set +a
(cd server && npm start) & server_pid=$!
(cd client && BROWSER=none PORT="${CLIENT_PORT:-3000}" npm start) & client_pid=$!
cleanup() { kill "$server_pid" "$client_pid" 2>/dev/null || true; }
trap cleanup EXIT INT TERM
wait "$server_pid" "$client_pid"
