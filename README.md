# IsoniaOS v0.8 Local Accountability Demo Stack

This repository provides a local Docker Compose stack for running the IsoniaOS
v0.8 accountability demo on a developer machine. It exists to make local
onboarding, deterministic runtime testing, and design-partner walkthroughs
easier.

It is local convenience infrastructure for App Core, Control Plane, and EVM
Contracts. It is not the integration lab, production or staging infrastructure,
an audit reference, a security guide, a hosted SaaS environment, or a
replacement for the contracts. The contracts deployed to the local Hardhat chain
remain the authority for modeled onchain governance state. Control Plane indexes
chain events into raw events, projections, and read models, so API state can lag
chain state. External links, manual records, and generated demo-stack manifests
are context or annotation unless an onchain model explicitly makes them
authoritative.

## Services

- `postgres`: local Control Plane database.
- `hardhat`: local Hardhat JSON-RPC node on `http://localhost:8545`.
- `contracts-deploy`: deploys and seeds the v0.8 demo contracts.
- `control-plane-migrate`: runs Control Plane database migrations.
- `control-plane`: runs the REST API, indexer, and projection worker.
- `app-core`: serves the built App Core SPA on `http://localhost:5173`.

## Target Versions

The Dockerfiles clone public runtime repositories at pinned Git tags derived
from `.env` version variables:

| Runtime repo/package | Tag |
| --- | --- |
| `@isonia/app-core` | `v${APP_CORE_VERSION}` |
| `@isonia/control-plane` | `v${CONTROL_PLANE_VERSION}` |
| `@isonia/evm-contracts` | `v${EVM_CONTRACTS_VERSION}` |

This stack directly tracks only App Core, Control Plane, and EVM Contracts.
Dependencies inside those repositories are owned by the cloned repository tags
and lockfiles, not by top-level demo-stack version variables.

The demo stack uses `.env` as the single source of truth for these runtime
versions. Keep the values without the leading `v`.

Copy `.env.demo.example` to `.env` before running Compose so these required
version variables are present.

These version variables select local clone/build tags and generated demo-stack
metadata. They are not Control Plane runtime capability authority.
`EVM_CONTRACTS_VERSION` specifically selects the local Hardhat contract image
and seed baseline. Control Plane runtime capability reporting uses
`ISONIA_PROTOCOL_PROFILE` and `ISONIA_DEPLOYMENT_CAPABILITIES_JSON` instead.

Docker builds `app-core` from Git tag `v${APP_CORE_VERSION}` and verifies that
the cloned `package.json.version` equals `APP_CORE_VERSION`. Changes committed
to `app-core/main` are not included in this demo image until the matching tag
exists, unless you intentionally change the Dockerfile or build args for local
development.

## Build Security Note

The `app-core` demo image sets `PNPM_CONFIG_DANGEROUSLY_ALLOW_ALL_BUILDS=true`
during Docker build.

This is a demo-only workaround for `pnpm` v11 restrictions on build scripts of
git-hosted dependencies such as `@isonia/sdk` and `@isonia/types`.

This setting weakens the default supply-chain protection of `pnpm` by allowing
dependency install and prepare scripts to run automatically, including inside
nested git dependencies cloned during the image build.

Do not reuse this setting unchanged for production images or unreviewed
dependency graphs.

## Prerequisites

- Docker.
- Docker Compose v2.
- Git, for local repository work and Docker image builds.
- A browser wallet, such as MetaMask or Rabby, for write-flow testing.

No private repositories, external RPC providers, or SaaS services are required.
If you use a standard Hardhat account in a wallet, treat it as local-only.

## Start

Create local settings:

```sh
cp .env.demo.example .env
```

Then start the stack:

```sh
docker compose up --build
```

You can also run Compose explicitly against the demo file:

```sh
docker compose -f docker-compose.demo.yml up --build
```

Open:

- App Core: <http://localhost:5173>
- App Core diagnostics: <http://localhost:5173/diagnostics>
- Control Plane diagnostics: <http://localhost:3000/v1/diagnostics>
- Control Plane indexer diagnostics: <http://localhost:3000/v1/diagnostics/indexer>
- Control Plane capabilities: <http://localhost:3000/v1/capabilities>
- Control Plane org finalization: `http://localhost:3000/v1/orgs/:orgId/finalization`
- Hardhat RPC: <http://localhost:8545>

## Demo Flow

1. Start the stack and wait for `contracts-deploy` to complete.
2. Open App Core at `http://localhost:5173`.
3. Open App Core `/diagnostics` and confirm the Control Plane API, contract
   addresses, indexer, projection worker, activation capabilities, and
   finalization status are visible.
4. Open Control Plane `/v1/diagnostics` and `/v1/capabilities`. Confirm the API
   is healthy, the indexer is caught up, serial activation is available, and
   contract batch activation plus bootstrap finalization are reported from the
   configured deployment/profile capability evidence.
5. Connect a browser wallet to chain ID `31337` with RPC URL
   `http://127.0.0.1:8545`.
6. Browse seeded organizations, governance structure, proposals, routes, and the
   graph view.
7. For setup testing, activate a draft organization through the setup flow.
8. After activation, check `GET /v1/orgs/:orgId/finalization` and finalize the
   organization from App Core when the connected account has indexed bootstrap
   admin authority.
9. Confirm the finalized organization remains active and readable. App Core
   should disable or explain bootstrap-admin actions that are no longer allowed
   after finalization.
10. For write-flow testing, use only local Hardhat accounts or local balances.

The demo seed creates local preview organizations and proposals by using the
existing `@isonia/evm-contracts` seed script. In v0.8 it also seeds one
approved-and-executed accountability action, one approved-but-not-executed
obligation action, and demo votes token mint/delegation data when
`IsoDemoVotesToken` is deployed.

The current setup flow is capability-aware. App Core reads
`GET /v1/capabilities` from Control Plane and uses typed contract batch
activation and bootstrap finalization only when the configured contracts
explicitly support them. Serial activation remains the fallback path. EIP-5792
wallet batching remains gated prototype behavior and is not the default
execution path.

## Runtime Files

Generated files are written to the host-visible `runtime/` directory:

| File | Purpose |
| --- | --- |
| `runtime/deployed-addresses.json` | Normalized contract addresses plus raw Hardhat Ignition output. |
| `runtime/control-plane.env` | Container-internal Control Plane environment. Uses `http://hardhat:8545` and deployment/profile capability evidence. |
| `runtime/isonia.config.json` | Browser App Core runtime config. Uses `http://127.0.0.1:8545` and `http://localhost:3000`. |
| `runtime/seed-output.json` | Seeded local accounts, organization IDs, body IDs, and proposal IDs. |
| `runtime/v0.8-accountability-demo.json` | Demo-stack-generated v0.8 scenario manifest and runtime metadata for future Control Plane/App Core archive and accountability work. |

The deployed contract address flow is:

```txt
Hardhat Ignition deployed_addresses.json
  -> scripts/generate-runtime-config.mjs
  -> runtime/deployed-addresses.json
  -> runtime/control-plane.env for Control Plane protocol contracts and capability profile
  -> runtime/isonia.config.json for App Core protocol and demo target contracts
```

Do not hardcode contract addresses in `.env`. Reset and redeploy when local
Hardhat state changes.

`runtime/seed-output.json` comes from `@isonia/evm-contracts seed:local`.
`runtime/v0.8-accountability-demo.json` is generated by this demo-stack from
that seed output, runtime version metadata, Control Plane profile/capability
metadata, and static local fixture metadata. Neither file is a production source
of authority.

`contracts-deploy` validates that generated runtime addresses match Ignition
output, Control Plane protocol contract config, App Core runtime config, and the
seeded contract addresses in `runtime/seed-output.json`. `GovCore`,
`GovProposals`, and `DemoTarget` are required for the local demo flow, but
`DemoTarget` is kept out of Control Plane runtime config. `IsoDemoVotesToken` is
optional for v0.7 compatibility, but if it appears in any v0.8 generated source
its address must match everywhere.

## Configuration

Edit `.env` for local ports and feature gates:

```txt
APP_CORE_VERSION=0.7.0-alpha.5
EVM_CONTRACTS_VERSION=0.8.0-alpha.1
CONTROL_PLANE_VERSION=0.8.0-alpha.1
VALIDATE_V08_SEED=true
ISONIA_PROTOCOL_PROFILE=current
ISONIA_DEPLOYMENT_CAPABILITIES_JSON={"activation":{"contractBatch":true},"finalization":{"organization":true}}
API_PORT=3000
APP_PORT=5173
HARDHAT_RPC_URL=http://127.0.0.1:8545
CHAIN_ID=31337
REOWN_PROJECT_ID=
WALLET_CONNECTION_MODE=injected-only
HARDHAT_VERBOSE_LOGS=false
createProposal=true
writeActions=true
manageOrg=true
```

The runtime version variables are the single sources for the corresponding demo
image tags, Git tags, generated demo-stack runtime metadata, and package version
checks. Keep them without the leading `v`.

`EVM_CONTRACTS_VERSION` is only the local `evm-contracts` clone/build tag for
demo-stack orchestration. It is not written to `runtime/control-plane.env`, and
Control Plane must not infer runtime capabilities from package versions.

`ISONIA_PROTOCOL_PROFILE` and `ISONIA_DEPLOYMENT_CAPABILITIES_JSON` are written
to `runtime/control-plane.env` for Control Plane capability reporting. The
defaults target the current local v0.8 IsoniaOS governance deployment:

```txt
ISONIA_PROTOCOL_PROFILE=current
ISONIA_DEPLOYMENT_CAPABILITIES_JSON={"activation":{"contractBatch":true},"finalization":{"organization":true}}
```

`VALIDATE_V08_SEED=true` enables the local v0.8 seed-output shape validation and
writes `runtime/v0.8-accountability-demo.json` after seeding.

`REOWN_PROJECT_ID` is empty by default and `WALLET_CONNECTION_MODE` defaults to
`injected-only`. App Core remains usable through injected wallet fallback even
if a local Reown project ID is present. Set `WALLET_CONNECTION_MODE=appkit` only
when explicitly testing Reown/AppKit wallet UX.

`HARDHAT_VERBOSE_LOGS=false` keeps normal demo logs focused on service state and
successful transactions. The Hardhat service starts through
`@isonia/evm-contracts` `node:local`, with the `hardhatMainnet` simulated
network selected explicitly and the container bind host set to `0.0.0.0`.
Because Hardhat's node task enables JSON-RPC request logging after startup,
`node:local` turns that request logging back off in normal mode. Set
`HARDHAT_VERBOSE_LOGS=true` before startup to preserve Hardhat node request logs
while debugging chain calls.

Browser wallets and wallet providers may still perform preflight simulations
when a transaction modal opens. In normal demo mode those Hardhat request traces
are quiet. If verbose logs show reverted `eth_call` traces from the first
Hardhat account, `0xf39f...`, while the actual transaction is sent from the
connected wallet, mined, indexed, and reflected in App Core, treat those traces
as wallet/provider simulation noise rather than a product failure. Actual
transaction failures remain visible in the wallet/App Core flow, and Control
Plane indexing failures remain visible in diagnostics and service logs.

Postgres is exposed only inside the Compose network by default. If you need host
access, add a local Compose override that maps `127.0.0.1:5432:5432`.

## Local Hardhat Time Controls

Any Hardhat time controls used by App Core are local-only JSON-RPC methods for
the demo chain. They do not represent behavior on public or shared networks.

## Reset Local State

To stop the stack, remove Docker volumes, remove generated runtime files, and
discard local Hardhat chain state:

```sh
bash scripts/reset-demo.sh --yes
```

This deletes local Postgres data and generated runtime files. It does not create
or delete Git tags.

When debugging a version change or stale runtime state, use a clean rebuild:

```sh
docker compose --env-file .env.demo.example -f docker-compose.demo.yml down -v
bash scripts/reset-demo.sh --yes
docker compose --env-file .env.demo.example -f docker-compose.demo.yml build --no-cache
docker compose --env-file .env.demo.example -f docker-compose.demo.yml up
```

## Troubleshooting

See [docs/troubleshooting.md](docs/troubleshooting.md) for common cases:

- contracts-deploy cannot find deployed addresses.
- Control Plane API unreachable.
- indexer stale or projection backlog.
- capabilities endpoint missing, contract batch unsupported, or finalization unsupported.
- finalization status unavailable or waiting for Control Plane indexing.
- App Core points to wrong contract addresses.
- optional `IsoDemoVotesToken` address mismatch.
- v0.8 seed-output or manifest generation failures.
- browser wallet wrong chain or account not funded.
- wallet/provider simulation noise in Hardhat logs.
- Hardhat verbose logging.
- Hardhat restarted and stale addresses.
- DemoTarget hash mismatch.
- ports already in use.
- pnpm GitHub tag dependency install issues inside Docker.
