# Changelog

All notable changes to the IsoniaOS demo stack are documented here.

Git tags use a leading `v`, for example `v0.7.0-alpha.4`.

## [Unreleased]

### Changed

- Update the local v0.7 demo stack to `@isonia/app-core v0.7.0-alpha.5` for
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

[Unreleased]: https://github.com/isoniaos/demo-stack/compare/v0.7.0-alpha.5...HEAD
[0.7.0-alpha.5]: https://github.com/isoniaos/demo-stack/compare/v0.7.0-alpha.4...v0.7.0-alpha.5
[0.7.0-alpha.4]: https://github.com/isoniaos/demo-stack/compare/v0.7.0-alpha.3...v0.7.0-alpha.4
