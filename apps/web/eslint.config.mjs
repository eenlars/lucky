import { dirname } from "node:path"
import { fileURLToPath } from "node:url"
import { FlatCompat } from "@eslint/eslintrc"

const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)

const compat = new FlatCompat({
  baseDirectory: __dirname,
})

const eslintConfig = [
  ...compat.extends("next/core-web-vitals", "next/typescript"),
  // Global rules
  {
    rules: {
      // Using @typescript-eslint/no-unused-vars instead of the standard rule
      // as it works better with TypeScript
      "no-unused-vars": "off",
      "@typescript-eslint/no-unused-vars": [
        "warn",
        {
          varsIgnorePattern: "^_",
          argsIgnorePattern: "^_",
          ignoreRestSiblings: true,
          caughtErrors: "none",
        },
      ],
      "@typescript-eslint/no-explicit-any": "off",
      // Disallow deep relative imports - use path aliases instead (@lucky/core/*, @lucky/examples/*, etc.)
      "no-restricted-imports": [
        "error",
        {
          patterns: [
            {
              group: ["**/../../*", "**/../../**"],
              message:
                "Deep relative imports are not allowed. Use path aliases like @lucky/core/*, @lucky/examples/*, @lucky/tools/*, etc. instead.",
            },
          ],
        },
      ],
    },
  },
]

export default eslintConfig
