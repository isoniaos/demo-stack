# Changelog

All notable changes to the IsoniaOS demo stack are documented here.

Git tags use a leading `v`, for example `v0.7.0-alpha.4`.

## [Unreleased]

## [0.7.0-alpha.4]

### Changed

- Started the demo Hardhat service through the `@isonia/evm-contracts`
  `node:local` path so the configured `hardhatMainnet` simulated network and
  normal-mode request logging toggle are used during local demos.
- Preserved `HARDHAT_VERBOSE_LOGS=true` as the opt-in path for full Hardhat
  request logs.
- Prepared the stack for `@isonia/evm-contracts` `v0.7.0-alpha.6`.

[Unreleased]: https://github.com/isoniaos/demo-stack/compare/v0.7.0-alpha.4...HEAD
[0.7.0-alpha.4]: https://github.com/isoniaos/demo-stack/compare/v0.7.0-alpha.3...v0.7.0-alpha.4
