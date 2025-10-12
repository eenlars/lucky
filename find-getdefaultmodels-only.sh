#!/bin/bash
# Find files that ONLY import getDefaultModels from compat

cd /Users/here/conductor/lucky/.conductor/managua-v1

rg "from ['\"]@core/core-config/compat['\"]" packages/core --type ts -l | while IFS= read -r file; do
  # Get all import lines from compat
  import_lines=$(rg "^import.*from ['\"]@core/core-config/compat['\"]" "$file")

  # Count how many imports
  import_count=$(echo "$import_lines" | wc -l | tr -d ' ')

  # If exactly one import and it contains only getDefaultModels
  if [ "$import_count" -eq 1 ]; then
    if echo "$import_lines" | grep -q "^import { getDefaultModels } from"; then
      echo "$file"
    fi
  fi
done
