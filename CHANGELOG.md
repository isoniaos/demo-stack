# Changelog

All notable changes to the IsoniaOS demo stack are documented here.

Git tags use a leading `v`, for example `v0.7.0-alpha.4`.

## [Unreleased]

### Changed

- Narrowed first-class demo-stack runtime version scope to App Core, Control
  Plane, and EVM Contracts.
- Removed redundant docs/types/sdk/theme version pins from demo-stack config,
  docs, and runtime metadata while keeping the v0.8 accountability seed bridge
  intact.

## [0.8.0-alpha.1]

### Added

- Added optional `IsoDemoVotesToken` address resolution and consistency
  validation across Ignition output, generated runtime config, App Core runtime
  config, and seed output.
- Added v0.8 seed-output validation for the accountability demo scenarios and
  optional demo votes token mint/delegation data.
- Added generation for `runtime/v0.8-accountability-demo.json`, a deterministic
  local manifest for future public archive and accountability API/UI work.
- Added v0.8 fixture inputs for script-level validation without committing
  generated runtime files.

### Changed

- Repositioned the stack as the v0.8 local accountability demo bridge.
- Updated the default contracts/docs/types metadata to
  `@isonia/evm-contracts v0.8.0-alpha.1`, `isoniaos/docs v0.8.0-alpha.2`, and
  `@isonia/types v0.8.0-alpha.1`.
- Kept Control Plane, App Core, SDK, and theme pins on their latest working
  v0.7/v0.6 tags while documenting that they may lag v0.8 runtime surfaces.
- Updated the local v0.7 demo stack to `@isonia/app-core v0.7.0-alpha.5` for
  the polished setup, activation, transaction modal, and breadcrumb UI.

## [0.7.0-alpha.5]

### Added

- Recorded the 2026-05-14 v0.7 demo stack clean-run verification notes.

## [0.7.0-alpha.4]

### Changed

- Started the demo Hardhat service through the `@isonia/evm-contracts`
  `node:local` path so the configured `hardhatMainnet` simulated network and
  normal-mode request logging toggle are used during local demos.
- Preserved `HARDHAT_VERBOSE_LOGS=true` as the opt-in path for full Hardhat
  request logs.
- Prepared the stack for `@isonia/evm-contracts` `v0.7.0-alpha.6`.

[Unreleased]: https://github.com/isoniaos/demo-stack/compare/v0.8.0-alpha.1...HEAD
[0.8.0-alpha.1]: https://github.com/isoniaos/demo-stack/compare/v0.7.0-alpha.5...v0.8.0-alpha.1
[0.7.0-alpha.5]: https://github.com/isoniaos/demo-stack/compare/v0.7.0-alpha.4...v0.7.0-alpha.5
[0.7.0-alpha.4]: https://github.com/isoniaos/demo-stack/compare/v0.7.0-alpha.3...v0.7.0-alpha.4
