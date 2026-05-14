#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd -P)"
REPO_URL="${EVM_CONTRACTS_REPO_URL:-https://github.com/isoniaos/evm-contracts.git}"
TAG="${EVM_CONTRACTS_TAG:-v0.7.0-alpha.5}"
WORK_DIR="${DEMO_WORK_DIR:-/work}"
CONTRACTS_DIR="${EVM_CONTRACTS_DIR:-${WORK_DIR}/evm-contracts}"
RUNTIME_DIR="${RUNTIME_DIR:-/runtime}"
CHAIN_ID="${CHAIN_ID:-31337}"
HARDHAT_RPC_URL="${HARDHAT_RPC_URL:-http://127.0.0.1:8545}"
RUN_SEED="${RUN_SEED:-true}"

log() {
  printf '[contracts-deploy] %s\n' "$*"
}

fail() {
  printf '[contracts-deploy] ERROR: %s\n' "$*" >&2
  exit 1
}

mkdir -p "$WORK_DIR" "$RUNTIME_DIR"

if [ ! -d "$CONTRACTS_DIR/.git" ]; then
  log "cloning ${REPO_URL} at ${TAG}"
  git clone --depth 1 --branch "$TAG" --single-branch "$REPO_URL" "$CONTRACTS_DIR"
else
  actual_tag="$(git -C "$CONTRACTS_DIR" describe --tags --exact-match 2>/dev/null || true)"
  if [ "$actual_tag" != "$TAG" ]; then
    fail "expected evm-contracts checkout at ${TAG}, found ${actual_tag:-no exact tag}"
  fi
  log "using evm-contracts checkout at ${TAG}: ${CONTRACTS_DIR}"
fi

cd "$CONTRACTS_DIR"

if [ ! -d node_modules ]; then
  log "installing evm-contracts dependencies"
  corepack enable
  corepack pnpm install --frozen-lockfile
fi

bash "${SCRIPT_DIR}/wait-for-http.sh" "$HARDHAT_RPC_URL" rpc 180

if [ "${CLEAN_LOCAL_IGNITION:-true}" = "true" ]; then
  ignition_dir="${CONTRACTS_DIR}/ignition/deployments/chain-${CHAIN_ID}"
  case "$ignition_dir" in
    "$CONTRACTS_DIR"/ignition/deployments/chain-*) rm -rf "$ignition_dir" ;;
    *) fail "refusing to remove unexpected ignition directory: ${ignition_dir}" ;;
  esac
fi

log "deploying IsoniaOS contracts to local Hardhat"
corepack pnpm deploy:local

addresses_file="$(find "${CONTRACTS_DIR}/ignition/deployments" -path "*/deployed_addresses.json" -type f | sort | tail -n 1 || true)"
if [ -z "$addresses_file" ]; then
  fail "cannot find deployed_addresses.json under ${CONTRACTS_DIR}/ignition/deployments"
fi

log "generating runtime config from ${addresses_file}"
DEPLOYED_ADDRESSES_SOURCE="$addresses_file" \
  RUNTIME_DIR="$RUNTIME_DIR" \
  node "${SCRIPT_DIR}/generate-runtime-config.mjs"
node "${SCRIPT_DIR}/validate-runtime-addresses.mjs"

set -a
. "${RUNTIME_DIR}/control-plane.env"
set +a

if [ "$RUN_SEED" = "true" ]; then
  log "seeding local demo organizations and proposals"
  corepack pnpm seed:local | tee "${RUNTIME_DIR}/seed-output.json"
  node "${SCRIPT_DIR}/validate-runtime-addresses.mjs" --require-seed
fi

log "runtime files written to ${RUNTIME_DIR}"
