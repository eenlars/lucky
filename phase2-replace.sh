#!/bin/bash
# Phase 2: Replace getDefaultModels imports from compat to coreConfig

cd /Users/here/conductor/lucky/.conductor/managua-v1/packages/core

# Find files and replace
grep -rl 'import { getDefaultModels } from "@core/core-config/compat"' src --include="*.ts" | while IFS= read -r file; do
  # Only replace if this is the ONLY compat import
  compat_count=$(grep -c 'from "@core/core-config/compat"' "$file")
  if [ "$compat_count" -eq 1 ]; then
    sed -i '' 's|from "@core/core-config/compat"|from "@core/core-config/coreConfig"|g' "$file"
    echo "✓ $file"
  fi
done
