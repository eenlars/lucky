// Import main directly - runtime config is handled via @example/index import
const { default: main } = await import("../packages/core/src/main")

main()

export {}
