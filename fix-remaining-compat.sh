#!/bin/bash
# Fix remaining compat imports systematically

cd /Users/here/conductor/lucky/.conductor/managua-v1/packages/core/src

echo "=== Remaining compat imports ==="
grep -r 'from "@core/core-config/compat"' . --include="*.ts" | wc -l

echo ""
echo "=== Import patterns ==="
grep -r 'from "@core/core-config/compat"' . --include="*.ts" -h | sort | uniq -c | sort -rn
