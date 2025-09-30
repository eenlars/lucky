#!/bin/bash
#
# Migrates imports from @runtime and @lucky/shared to core-local equivalents.
# Phase 2 of the migration plan: Update all imports mechanically.
#

set -e

CORE_ROOT="$(cd "$(dirname "$0")/.." && pwd)"
SRC_DIR="$CORE_ROOT/src"

echo "==================================="
echo "Migrating imports to core-local"
echo "==================================="
echo ""

# Count files before migration
RUNTIME_FILES_BEFORE=$(grep -rl "from ['\"]@runtime" "$SRC_DIR" --include="*.ts" 2>/dev/null | wc -l | tr -d ' ')
SHARED_FILES_BEFORE=$(grep -rl "from ['\"]@lucky/shared" "$SRC_DIR" --include="*.ts" 2>/dev/null | wc -l | tr -d ' ')

echo "Files with @runtime imports: $RUNTIME_FILES_BEFORE"
echo "Files with @lucky/shared imports: $SHARED_FILES_BEFORE"
echo ""

# Step 1: Update @runtime/settings imports to use compat layer
echo "Step 1: Migrating @runtime/settings imports to @core/core-config/compat..."
find "$SRC_DIR" -name "*.ts" -type f -exec sed -i '' \
  's|from ["'\'']@runtime/settings/constants["'\'']|from "@core/core-config/compat"|g' {} \;
find "$SRC_DIR" -name "*.ts" -type f -exec sed -i '' \
  's|from ["'\'']@runtime/settings/constants.client["'\'']|from "@core/core-config/compat"|g' {} \;
find "$SRC_DIR" -name "*.ts" -type f -exec sed -i '' \
  's|from ["'\'']@runtime/settings/models["'\'']|from "@core/core-config/compat"|g' {} \;
find "$SRC_DIR" -name "*.ts" -type f -exec sed -i '' \
  's|from ["'\'']@runtime/settings/tools["'\'']|from "@core/core-config/compat"|g' {} \;
find "$SRC_DIR" -name "*.ts" -type f -exec sed -i '' \
  's|from ["'\'']@runtime/settings/evolution["'\'']|from "@core/core-config/compat"|g' {} \;
find "$SRC_DIR" -name "*.ts" -type f -exec sed -i '' \
  's|from ["'\'']@runtime/settings/inputs["'\'']|from "@core/core-config/compat"|g' {} \;

echo "✓ @runtime/settings imports migrated"
echo ""

# Step 2: Update @lucky/shared JSONN imports
echo "Step 2: Migrating @lucky/shared JSONN imports to @core/utils/json..."
find "$SRC_DIR" -name "*.ts" -type f -exec sed -i '' \
  's|import { JSONN } from ["'\'']@lucky/shared["'\'']|import { JSONN } from "@core/utils/json"|g' {} \;
find "$SRC_DIR" -name "*.ts" -type f -exec sed -i '' \
  's|import { isJSON } from ["'\'']@lucky/shared["'\'']|import { isJSON } from "@core/utils/json"|g' {} \;

echo "✓ @lucky/shared JSONN imports migrated"
echo ""

# Step 3: Update @lucky/shared database type imports
echo "Step 3: Migrating @lucky/shared database type imports..."
find "$SRC_DIR" -name "*.ts" -type f -exec sed -i '' \
  's|import type { Json } from ["'\'']@lucky/shared["'\'']|import type { Json } from "@core/utils/json"|g' {} \;
find "$SRC_DIR" -name "*.ts" -type f -exec sed -i '' \
  's|import type { Database } from ["'\'']@lucky/shared["'\'']|import type { Database } from "@core/utils/json"|g' {} \;
find "$SRC_DIR" -name "*.ts" -type f -exec sed -i '' \
  's|import type { Enums } from ["'\'']@lucky/shared["'\'']|import type { Enums } from "@core/utils/json"|g' {} \;
find "$SRC_DIR" -name "*.ts" -type f -exec sed -i '' \
  's|import type { Tables } from ["'\'']@lucky/shared["'\'']|import type { Tables } from "@core/utils/json"|g' {} \;
find "$SRC_DIR" -name "*.ts" -type f -exec sed -i '' \
  's|import type { TablesInsert } from ["'\'']@lucky/shared["'\'']|import type { TablesInsert } from "@core/utils/json"|g' {} \;
find "$SRC_DIR" -name "*.ts" -type f -exec sed -i '' \
  's|import type { TablesUpdate } from ["'\'']@lucky/shared["'\'']|import type { TablesUpdate } from "@core/utils/json"|g' {} \;

# Handle multi-import statements
find "$SRC_DIR" -name "*.ts" -type f -exec sed -i '' \
  's|import { Json } from ["'\'']@lucky/shared["'\'']|import { Json } from "@core/utils/json"|g' {} \;
find "$SRC_DIR" -name "*.ts" -type f -exec sed -i '' \
  's|import type { Json, TablesInsert, TablesUpdate } from ["'\'']@lucky/shared["'\'']|import type { Json, TablesInsert, TablesUpdate } from "@core/utils/json"|g' {} \;

echo "✓ @lucky/shared type imports migrated"
echo ""

# Step 4: Handle @runtime/code_tools/file-saver imports
echo "Step 4: Checking for @runtime/code_tools/file-saver imports..."
FILE_SAVER_COUNT=$(grep -rl "from ['\"]@runtime/code_tools/file-saver" "$SRC_DIR" --include="*.ts" 2>/dev/null | wc -l | tr -d ' ')
if [ "$FILE_SAVER_COUNT" -gt 0 ]; then
  echo "⚠️  Found $FILE_SAVER_COUNT files using @runtime/code_tools/file-saver"
  echo "   These will need manual migration or a compatibility shim"
  grep -rl "from ['\"]@runtime/code_tools/file-saver" "$SRC_DIR" --include="*.ts" 2>/dev/null || true
else
  echo "✓ No @runtime/code_tools/file-saver imports found"
fi
echo ""

# Step 5: Check for any remaining @runtime imports
echo "Step 5: Checking for remaining @runtime imports..."
REMAINING_RUNTIME=$(grep -rl "from ['\"]@runtime" "$SRC_DIR" --include="*.ts" 2>/dev/null | wc -l | tr -d ' ')
if [ "$REMAINING_RUNTIME" -gt 0 ]; then
  echo "⚠️  Found $REMAINING_RUNTIME files still using @runtime imports:"
  grep -rl "from ['\"]@runtime" "$SRC_DIR" --include="*.ts" 2>/dev/null | head -10 || true
  if [ "$REMAINING_RUNTIME" -gt 10 ]; then
    echo "   ... and $((REMAINING_RUNTIME - 10)) more"
  fi
else
  echo "✅ No @runtime imports remaining!"
fi
echo ""

# Step 6: Check for any remaining @lucky/shared imports
echo "Step 6: Checking for remaining @lucky/shared imports..."
REMAINING_SHARED=$(grep -rl "from ['\"]@lucky/shared" "$SRC_DIR" --include="*.ts" 2>/dev/null | wc -l | tr -d ' ')
if [ "$REMAINING_SHARED" -gt 0 ]; then
  echo "⚠️  Found $REMAINING_SHARED files still using @lucky/shared imports:"
  grep -rl "from ['\"]@lucky/shared" "$SRC_DIR" --include="*.ts" 2>/dev/null || true
else
  echo "✅ No @lucky/shared imports remaining!"
fi
echo ""

echo "==================================="
echo "Migration Summary"
echo "==================================="
echo "Before: $RUNTIME_FILES_BEFORE @runtime files, $SHARED_FILES_BEFORE @lucky/shared files"
echo "After:  $REMAINING_RUNTIME @runtime files, $REMAINING_SHARED @lucky/shared files"
echo ""

if [ "$REMAINING_RUNTIME" -eq 0 ] && [ "$REMAINING_SHARED" -eq 0 ]; then
  echo "✅ All imports successfully migrated!"
  echo ""
  echo "Next steps:"
  echo "  1. Run: cd core && bun run tsc"
  echo "  2. Fix any type errors"
  echo "  3. Run: cd core && bun run test:unit"
  echo "  4. Switch compat.ts to use local config"
else
  echo "⚠️  Some imports still need manual attention"
  echo ""
  echo "Next steps:"
  echo "  1. Review remaining imports listed above"
  echo "  2. Create compatibility shims if needed"
  echo "  3. Re-run this script"
fi

exit 0
