# Troubleshooting

This demo stack is local-only. Contracts remain authoritative on the local
Hardhat chain. Control Plane indexes events into raw events, projections, and
read models, so API state can lag chain state while the indexer or projection
worker catches up.

## contracts-deploy cannot find deployed addresses

The deploy script expects Hardhat Ignition output under:

```txt
ignition/deployments/*/deployed_addresses.json
```

For v0.7 it recognizes these keys:

```txt
IsoniaProtocolV01Module#GovCore
IsoniaProtocolV01Module#GovProposals
IsoniaProtocolV01Module#DemoTarget
```

Reset the stack and redeploy:

```sh
bash scripts/reset-demo.sh --yes
docker compose -f docker-compose.demo.yml up --build
```

## Control Plane API unreachable

Check the API logs:

```sh
docker compose -f docker-compose.demo.yml logs control-plane
```

Then check whether the diagnostics endpoint responds:

```sh
curl http://localhost:3000/v1/diagnostics
```

If port `3000` is already in use, change `API_PORT` in `.env` and restart.

## Indexer stale or projection backlog

Open:

```txt
http://localhost:3000/v1/diagnostics
http://localhost:3000/v1/diagnostics/indexer
http://localhost:3000/v1/capabilities
```

The indexer reads the local Hardhat RPC. The projection worker turns raw events
into read models. A short lag is expected after startup or after wallet
transactions. If the backlog does not drain, inspect:

```sh
docker compose -f docker-compose.demo.yml logs control-plane
```

## Capabilities endpoint missing or contract batch unsupported

Control Plane v0.7 exposes:

```sh
curl http://localhost:3000/v1/capabilities
```

Serial activation should be reported as available. Contract batch activation is
reported as supported only when the generated Control Plane environment includes:

```txt
EVM_CONTRACTS_VERSION=0.7.0-alpha.1
```

Check the generated file:

```txt
runtime/control-plane.env
```

If the endpoint is missing, confirm the stack is using
`CONTROL_PLANE_VERSION=0.7.0-alpha.1`. If contract batch is unsupported, confirm
the stack is using `EVM_CONTRACTS_VERSION=0.7.0-alpha.1`, then reset and
redeploy the local demo state.

App Core reads capabilities from the configured `apiBaseUrl` in:

```txt
runtime/isonia.config.json
```

The default browser API base URL is `http://localhost:3000`, with CORS allowing
the local App Core host. EIP-5792 wallet batching is not the default path.

## App Core points to wrong contract addresses

The browser runtime config is generated at:

```txt
runtime/isonia.config.json
```

The normalized deployment output is:

```txt
runtime/deployed-addresses.json
```

If Hardhat restarted but old runtime or Postgres state remains, reset the demo
state and bring the stack up again.

## Browser wallet wrong chain

Use chain ID `31337` and RPC URL:

```txt
http://127.0.0.1:8545
```

The app runtime config must use a browser-reachable RPC URL, not the container
URL `http://hardhat:8545`.

## Browser wallet account not funded

Hardhat local accounts are funded only on the local chain. They are not real
network accounts. Import or connect a local Hardhat account only for this demo,
or use Hardhat JSON-RPC methods to set a balance for a browser-wallet address.

## Hardhat restarted and stale addresses

Hardhat runs an in-memory local chain. Restarting it deletes local chain state.
Postgres and runtime files may still refer to the previous chain run. Use:

```sh
bash scripts/reset-demo.sh --yes
```

Then start the stack again.

## DemoTarget hash mismatch

App Core executes the local demo path for `DemoTarget.setNumber`. If the
proposal data hash does not match the configured `DemoTarget` address and
encoded action, recreate the proposal after confirming:

```txt
runtime/isonia.config.json
runtime/deployed-addresses.json
```

## Ports already in use

Defaults:

```txt
App Core: 5173
Control Plane: 3000
Hardhat RPC: 8545
```

Set `APP_PORT`, `API_PORT`, or `HARDHAT_PORT` in `.env`. If you change the
Hardhat host port, also update `HARDHAT_RPC_URL` so the browser config matches.

## pnpm GitHub tag dependency install issues inside Docker

The Dockerfiles clone public repositories at pinned tags and install their
lockfiles. If install fails while fetching GitHub tag dependencies, retry the
build after checking network access from Docker:

```sh
docker compose -f docker-compose.demo.yml build --no-cache
```
