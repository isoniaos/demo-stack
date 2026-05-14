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

## Capabilities endpoint missing, contract batch unsupported, or finalization unsupported

Control Plane v0.7 exposes:

```sh
curl http://localhost:3000/v1/capabilities
```

Serial activation should be reported as available. Contract batch activation and
bootstrap finalization are reported as supported only when the generated Control
Plane environment includes a finalization-capable contracts version:

```txt
EVM_CONTRACTS_VERSION=0.7.0-alpha.6
```

`0.7.0-alpha.1` supports activation batch but not finalization. `0.7.0-alpha.2`
and later v0.7 alpha contract tags support activation batch and bootstrap
finalization.

Check the generated file:

```txt
runtime/control-plane.env
```

If the endpoint is missing, confirm the stack is using
`CONTROL_PLANE_VERSION=0.7.0-alpha.2`. If finalization is unsupported, confirm
the stack is using `EVM_CONTRACTS_VERSION=0.7.0-alpha.6`, then reset and
redeploy the local demo state.

App Core reads capabilities from the configured `apiBaseUrl` in:

```txt
runtime/isonia.config.json
```

The default browser API base URL is `http://localhost:3000`, with CORS allowing
the local App Core host. EIP-5792 wallet batching is not the default path.

## Finalization endpoint unavailable

Control Plane v0.7.0-alpha.2 exposes:

```sh
curl http://localhost:3000/v1/orgs/<orgId>/finalization
```

Use an organization ID from App Core or `runtime/seed-output.json`. If the
endpoint returns 404 for the route itself, rebuild with
`CONTROL_PLANE_VERSION=0.7.0-alpha.2`. If it returns an organization-specific
not found response, wait for indexing or confirm the org ID exists in the local
seed output.

## App Core finalization status unavailable

App Core reads finalization state from the configured API base URL in:

```txt
runtime/isonia.config.json
```

Check that Control Plane is reachable from the browser at
`http://localhost:3000`, then open `/v1/diagnostics`, `/v1/capabilities`, and
the org finalization endpoint. A short unavailable state can be normal while the
indexer and projection worker catch up after startup.

## Finalization CTA disabled

App Core disables or explains the finalization action when the connected wallet
does not have indexed bootstrap admin authority, the organization is not active,
the organization is already finalized, or capabilities report finalization as
unsupported.

Confirm the connected wallet is a local Hardhat account used by the seed/setup
flow, then wait for Control Plane indexing if the transaction or account state
changed recently.

## Finalization transaction succeeded but UI still waits

The contract transaction is authoritative as soon as it is mined on the local
Hardhat chain, but App Core displays indexed Control Plane state. Wait for the
indexer and projection worker to process the finalization event, then refresh
the organization page if needed.

Inspect progress with:

```txt
http://localhost:3000/v1/diagnostics
http://localhost:3000/v1/diagnostics/indexer
```

## Old seed or deploy aliases no longer exist

The demo stack uses the canonical local scripts from `@isonia/evm-contracts`:

```sh
corepack pnpm deploy:local
corepack pnpm seed:local
```

Older preview-specific deploy or seed aliases are not part of this baseline.
Update local notes or shell history that still references them.

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

`contracts-deploy` runs `scripts/validate-runtime-addresses.mjs` to fail fast
when Ignition output, generated runtime files, or seed output disagree about the
GovCore, GovProposals, or DemoTarget addresses. You can also run it manually
after a deploy:

```sh
node scripts/validate-runtime-addresses.mjs --require-seed
```

If you are testing an adjacent local App Core dev server instead of the Docker
image, check for a stale `public/isonia.config.local.json` in `app-core`. App
Core loads `/isonia.config.local.json` before `/isonia.config.json`, so a local
override can shadow the demo-stack generated runtime config.

## Wallet provider simulation noise in Hardhat logs

Normal demo mode keeps Hardhat request logging quiet. The Hardhat container
starts through `@isonia/evm-contracts` `node:local`, selecting the configured
`hardhatMainnet` simulated network while binding to `0.0.0.0` inside Docker.
Because Hardhat's node task enables JSON-RPC request logging after startup,
`node:local` turns that request logging back off in normal mode. If verbose
logging is enabled, browser wallets or wallet UX providers may still make
preflight `eth_call`, gas estimation, capability, or smart-account simulation
requests before showing a confirmation. These calls can omit `from`, so Hardhat
displays the first local account, `0xf39f...`, even when the real transaction is
later sent by the connected admin wallet.

Treat these lines as simulation noise when all of these are true:

- App Core shows the transaction as submitted, confirmed, and indexed.
- The successful transaction hash in Hardhat or the wallet is from the connected
  admin wallet.
- Control Plane diagnostics show no indexing or projection backlog that fails to
  drain.
- `runtime/deployed-addresses.json`, `runtime/control-plane.env`, and
  `runtime/isonia.config.json` use the same contract addresses.

If App Core shows a failed transaction, or no transaction hash is produced,
debug it as an actual transaction failure instead of suppressing logs. Actual
transaction failures and Control Plane indexing/projection failures remain
visible through App Core, diagnostics, or service logs.

## Hardhat verbose logging

Set this before startup to restore detailed Hardhat request logs:

```sh
HARDHAT_VERBOSE_LOGS=true docker compose --env-file .env.demo.example -f docker-compose.demo.yml up
```

Leave `HARDHAT_VERBOSE_LOGS=false` for normal demos. This changes only console
verbosity; it does not relax Solidity reverts or Hardhat call-failure behavior.

## App Core image uses an older fix

The App Core Docker image clones `app-core` by `APP_CORE_TAG=v${APP_CORE_VERSION}`
and then verifies `package.json.version`. A fix on `app-core/main` is not used by
this stack until it is tagged and `APP_CORE_VERSION` is updated. After changing
versions, rebuild without cache if the old image may still be present:

```sh
docker compose --env-file .env.demo.example -f docker-compose.demo.yml build --no-cache app-core
```

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
