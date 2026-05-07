#!/usr/bin/env bash
set -euo pipefail

url="${1:-}"
mode="${2:-get}"
timeout_seconds="${3:-120}"

if [ -z "$url" ]; then
  echo "Usage: wait-for-http.sh <url> [get|rpc] [timeout_seconds]" >&2
  exit 2
fi

start_time="$(date +%s)"

echo "[wait-for-http] waiting for ${url} (${mode})"

while true; do
  if [ "$mode" = "rpc" ]; then
    if node -e "
      const url = process.argv[1];
      fetch(url, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ jsonrpc: '2.0', method: 'eth_chainId', params: [], id: 1 }),
      }).then(async (response) => {
        if (!response.ok) process.exit(1);
        const payload = await response.json();
        process.exit(payload && payload.result ? 0 : 1);
      }).catch(() => process.exit(1));
    " "$url"; then
      echo "[wait-for-http] ready: ${url}"
      exit 0
    fi
  else
    if node -e "
      const url = process.argv[1];
      fetch(url, { cache: 'no-store' })
        .then((response) => process.exit(response.ok ? 0 : 1))
        .catch(() => process.exit(1));
    " "$url"; then
      echo "[wait-for-http] ready: ${url}"
      exit 0
    fi
  fi

  now="$(date +%s)"
  elapsed=$((now - start_time))
  if [ "$elapsed" -ge "$timeout_seconds" ]; then
    echo "[wait-for-http] timed out after ${timeout_seconds}s: ${url}" >&2
    exit 1
  fi
  sleep 2
done
