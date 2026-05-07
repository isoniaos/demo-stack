#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd -P)"
REPO_ROOT="$(cd "${SCRIPT_DIR}/.." && pwd -P)"
COMPOSE_FILE="${COMPOSE_FILE:-docker-compose.demo.yml}"
RUNTIME_DIR="${RUNTIME_DIR:-${REPO_ROOT}/runtime}"

if [ "${1:-}" != "--yes" ] && [ "${1:-}" != "-y" ]; then
  cat <<'EOF'
This deletes local demo state: Docker Compose containers, named volumes,
local Postgres data, generated runtime files, and the current local Hardhat
chain state. Re-run with --yes to continue.
EOF
  exit 1
fi

echo "[reset-demo] stopping compose stack and removing volumes"
docker compose -f "${REPO_ROOT}/${COMPOSE_FILE}" down -v --remove-orphans

runtime_parent="$(cd "$(dirname "$RUNTIME_DIR")" && pwd -P)"
runtime_name="$(basename "$RUNTIME_DIR")"
runtime_path="${runtime_parent}/${runtime_name}"

case "$runtime_path" in
  "${REPO_ROOT}/runtime")
    echo "[reset-demo] removing generated runtime files at ${runtime_path}"
    rm -rf "$runtime_path"
    ;;
  *)
    echo "[reset-demo] refusing to remove unexpected runtime path: ${runtime_path}" >&2
    exit 1
    ;;
esac

echo "[reset-demo] reset complete"
