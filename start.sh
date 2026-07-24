#!/usr/bin/env bash
set -euo pipefail
root="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$root"
[[ -f .env ]] || { echo "Missing .env; copy .env.example." >&2; exit 1; }
[[ -d server/node_modules && -d client/node_modules ]] || { echo "Run ./scripts/bootstrap.sh first." >&2; exit 1; }
set -a; source .env; set +a

server_port="${SERVER_PORT:-${BACKEND_PORT:-${PORT:-3001}}}"
client_port="${CLIENT_PORT:-${FRONTEND_PORT:-3000}}"
if lsof -nP -iTCP:"$server_port" -sTCP:LISTEN >/dev/null 2>&1; then
  echo "Server port $server_port is already in use." >&2
  exit 1
fi
if lsof -nP -iTCP:"$client_port" -sTCP:LISTEN >/dev/null 2>&1; then
  echo "Client port $client_port is already in use." >&2
  exit 1
fi

if [[ "${MIGRATE_ON_START:-false}" == "true" ]]; then
  [[ "${ALLOW_SCHEMA_MIGRATION:-}" == "1" || "${ALLOW_SCHEMA_MIGRATION:-}" == "true" ]] || {
    echo "MIGRATE_ON_START requires ALLOW_SCHEMA_MIGRATION=1." >&2
    exit 1
  }
  bash "$root/scripts/migrate.sh"
  node "$root/server/create-admin.js"
fi

(cd server && PORT="$server_port" npm start) & server_pid=$!
(cd client && BROWSER=none PORT="$client_port" BACKEND_PORT="$server_port" ./node_modules/.bin/react-scripts start) & client_pid=$!
cleanup() { kill "$server_pid" "$client_pid" 2>/dev/null || true; }
trap cleanup EXIT INT TERM
wait "$server_pid" "$client_pid"
