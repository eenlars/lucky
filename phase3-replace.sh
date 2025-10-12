#!/bin/bash
# Phase 3: Replace CONFIG imports with getCoreConfig()

cd /Users/here/conductor/lucky/.conductor/managua-v1/packages/core

# Process each file
grep -rl '^import { CONFIG } from "@core/core-config/compat"' src --include="*.ts" | while IFS= read -r file; do
  # Check this is the ONLY compat import
  compat_count=$(grep -c 'from "@core/core-config/compat"' "$file")
  if [ "$compat_count" -eq 1 ]; then
    # Replace import
    sed -i '' 's/import { CONFIG } from "@core\/core-config\/compat"/import { getCoreConfig } from "@core\/core-config\/coreConfig"/' "$file"

    # Replace all CONFIG. with getCoreConfig().
    sed -i '' 's/CONFIG\./getCoreConfig()./g' "$file"

    echo "✓ $file"
  fi
done
