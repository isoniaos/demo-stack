# IsoniaOS v0.6 Local Docker Demo Stack

This repository provides a local Docker Compose stack for running the IsoniaOS
v0.6 alpha demo on a developer machine. It exists to make local onboarding and
design-partner walkthroughs easier.

It is not a production deployment, audit reference, security guide, hosted SaaS
environment, or replacement for the contracts. The contracts deployed to the
local Hardhat chain remain the authority for governance state. Control Plane
indexes chain events into raw events, projections, and read models, so API state
can briefly lag chain state.

## Services

- `postgres`: local Control Plane database.
- `hardhat`: local Hardhat JSON-RPC node on `http://localhost:8545`.
- `contracts-deploy`: deploys and seeds the v0.6 demo contracts.
- `control-plane-migrate`: runs Control Plane database migrations.
- `control-plane`: runs the REST API, indexer, and projection worker.
- `app-core`: serves the built App Core SPA on `http://localhost:5173`.

## Target Versions

The Dockerfiles clone public repositories at pinned Git tags derived from `.env`
version variables:

| Package | Tag |
| --- | --- |
| `@isonia/types` | `v0.6.0-alpha.2` |
| `@isonia/sdk` | `v0.6.0-alpha.4` |
| `@isonia/theme-default` | `v0.6.0-alpha.2` |
| `@isonia/control-plane` | `v0.6.0-alpha.2` |
| `@isonia/evm-contracts` | `v0.6.0-alpha.3` |
| `@isonia/app-core` | `v0.6.0-alpha.7` |
| `isoniaos/docs` | `v0.6.0-alpha.6` |

The docs tag is listed for alignment. This stack does not clone the docs repo at
runtime.

The demo stack uses `.env` as the single source of truth for these repository
versions. Keep the values without the leading `v`.

Copy `.env.demo.example` to `.env` before running Compose so these required
version variables are present.

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
- Hardhat RPC: <http://localhost:8545>

## Demo Flow

1. Start the stack and wait for `contracts-deploy` to complete.
2. Open App Core at `http://localhost:5173`.
3. Open `/diagnostics` and confirm the Control Plane API, contract addresses,
   indexer, and projection worker are visible.
4. Connect a browser wallet to chain ID `31337` with RPC URL
   `http://127.0.0.1:8545`.
5. Browse seeded organizations, governance structure, proposals, routes, and the
   graph view.
6. For write-flow testing, use only local Hardhat accounts or local balances.

The demo seed creates local preview organizations and proposals by using the
existing `@isonia/evm-contracts` seed script. It does not add new contract
behavior.

## Runtime Files

Generated files are written to the host-visible `runtime/` directory:

| File | Purpose |
| --- | --- |
| `runtime/deployed-addresses.json` | Normalized contract addresses plus raw Hardhat Ignition output. |
| `runtime/control-plane.env` | Container-internal Control Plane environment. Uses `http://hardhat:8545`. |
| `runtime/isonia.config.json` | Browser App Core runtime config. Uses `http://127.0.0.1:8545` and `http://localhost:3000`. |
| `runtime/seed-output.json` | Seeded local accounts, organization IDs, body IDs, and proposal IDs. |

The deployed contract address flow is:

```txt
Hardhat Ignition deployed_addresses.json
  -> scripts/generate-runtime-config.mjs
  -> runtime/deployed-addresses.json
  -> runtime/control-plane.env
  -> runtime/isonia.config.json
  -> Control Plane and App Core
```

Do not hardcode contract addresses in `.env`. Reset and redeploy when local
Hardhat state changes.

## Configuration

Edit `.env` for local ports and feature gates:

```txt
APP_CORE_VERSION=0.6.0-alpha.18
EVM_CONTRACTS_VERSION=0.6.0-alpha.4
CONTROL_PLANE_VERSION=0.6.0-alpha.2
API_PORT=3000
APP_PORT=5173
HARDHAT_RPC_URL=http://127.0.0.1:8545
CHAIN_ID=31337
REOWN_PROJECT_ID=
createProposal=true
writeActions=true
manageOrg=true
```

`APP_CORE_VERSION`, `EVM_CONTRACTS_VERSION`, and `CONTROL_PLANE_VERSION` are the
single sources for the corresponding demo image tags, Git tags, and package
version checks. Keep them without the leading `v`.

`REOWN_PROJECT_ID` is empty by default. App Core remains usable through injected
wallet fallback.

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

## Troubleshooting

See [docs/troubleshooting.md](docs/troubleshooting.md) for common cases:

- contracts-deploy cannot find deployed addresses.
- Control Plane API unreachable.
- indexer stale or projection backlog.
- App Core points to wrong contract addresses.
- browser wallet wrong chain or account not funded.
- Hardhat restarted and stale addresses.
- DemoTarget hash mismatch.
- ports already in use.
- pnpm GitHub tag dependency install issues inside Docker.
