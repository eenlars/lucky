/**
 * Global test setup
 * Runs before all tests in all projects
 */

// Set deterministic timezone for date tests
process.env.TZ = "UTC"

// Disable color output in CI for cleaner logs
if (process.env.CI) {
  process.env.FORCE_COLOR = "0"
}
