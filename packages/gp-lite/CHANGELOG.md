# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/), and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Added
- Generic time/cost estimator: `estimateRun`, `estimateFromMetrics`.
- Extended README with configuration, budgets, and estimator docs.
- Architecture, Contributing, Code of Conduct, and Security documents.

### Changed
- Engine now stops immediately after initialization if `maxEvaluations` budget is exhausted.
- Relaxed tournament size guard to allow sampling-with-replacement with `tournament > popSize`.

