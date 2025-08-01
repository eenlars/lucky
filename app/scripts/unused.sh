#!/usr/bin/env bash
set -euo pipefail

########################################
# CONFIGURATION
########################################

# Root directory to scan for your TS/JS source files
ROOT_DIR="./src"

# Globs of files to search for imports
IMPORT_GLOBS=( '*.ts' '*.tsx' '*.js' '*.jsx' )

# Find-exclusions for source scan
EXCLUDE_PATHS=(
  "*/__tests__/*"
  "*/*.test.ts"
  "*/*.test.tsx"
  "*/*.spec.ts"
  "*/*.spec.tsx"
  "*/node_modules/*"
  "*/react-flow-visualization/*"
  "*/ui/*"
)

# Regex matching an export at start of line
EXPORT_REGEX='^\s*export '

# Template for matching imports/requires/dynamic imports; %s → module path
IMPORT_PATTERN_TPL="from ['\"].*%s(['\"/])|require\(['\"]%s['\"]\)|import\(['\"]%s['\"]\)"

########################################
# FUNCTION: Find unused exported modules
########################################
find_unused_exports() {
  echo "🔍 Scanning for unused exported modules under ${ROOT_DIR}…"

  scanned=0
  unused=()

  # Build the `find` command with excludes
  find_cmd=( find "$ROOT_DIR" -type f \( -name "*.ts" -o -name "*.tsx" \) )
  for p in "${EXCLUDE_PATHS[@]}"; do
    find_cmd+=( -not -path "$p" )
  done
  find_cmd+=( -exec grep -IlE "$EXPORT_REGEX" {} \; )

  # Iterate over each exporting file
  while IFS= read -r file; do
    scanned=$((scanned+1))

    # Derive module path: strip ROOT_DIR prefix & extension
    rel="${file#"$ROOT_DIR"/}"
    mod="${rel%.*}"

    # If it's an index file, treat module as its parent dir
    if [[ "$mod" == */index ]]; then
      mod="${mod%/index}"
    fi

    # Escape for grep
    esc_mod=$(printf '%s' "$mod" | sed 's/[][\\/.*^$]/\\&/g')

    # Build the import/search regex
    pattern=$(printf "$IMPORT_PATTERN_TPL" "$esc_mod" "$esc_mod" "$esc_mod")

    # Search for any import/require/import() — excluding node_modules
    if ! grep -R \
        --exclude-dir="node_modules" \
        --include="${IMPORT_GLOBS[0]}" \
        --include="${IMPORT_GLOBS[1]}" \
        --include="${IMPORT_GLOBS[2]}" \
        --include="${IMPORT_GLOBS[3]}" \
        -E "$pattern" . >/dev/null; then
      unused+=( "$file" )
      echo "⚠️  Unused exports in: $file"
    fi
  done < <("${find_cmd[@]}")

  echo
  if [ ${#unused[@]} -gt 0 ]; then
    echo "=> Found ${#unused[@]} unused exporting file(s) out of $scanned scanned."
    exit_code=1
  else
    echo "✅ No unused exports found in $scanned scanned files."
    exit_code=0
  fi

  return $exit_code
}

########################################
# FUNCTION: Find individual unused exports within files
########################################
find_unused_individual_exports() {
  echo
  echo "🔎 Scanning for individual unused exports within files…"
  
  local individual_unused=()
  
  # Find all TypeScript files with exports
  while IFS= read -r file; do
    # Extract exported identifiers (functions, classes, interfaces, types, consts)
    while IFS= read -r export_line; do
      # Parse different export patterns
      if [[ "$export_line" =~ export[[:space:]]+(function|class|interface|type|const|let|var)[[:space:]]+([a-zA-Z_][a-zA-Z0-9_]*) ]]; then
        export_name="${BASH_REMATCH[2]}"
      elif [[ "$export_line" =~ export[[:space:]]*\{[^}]*\} ]]; then
        # Handle named exports like: export { foo, bar }
        exports_block=$(echo "$export_line" | sed 's/export[[:space:]]*{//; s/}.*//; s/[[:space:]]//g')
        IFS=',' read -ra EXPORT_NAMES <<< "$exports_block"
        for export_name in "${EXPORT_NAMES[@]}"; do
          # Clean up export name (remove 'as' aliases)
          clean_name=$(echo "$export_name" | sed 's/[[:space:]]*as[[:space:]].*//')
          if [[ -n "$clean_name" && ! "$clean_name" =~ ^[[:space:]]*$ ]]; then
            # Search for usage of this export
            if ! grep -R \
                --exclude-dir="node_modules" \
                --exclude="$file" \
                --include="*.ts" \
                --include="*.tsx" \
                -E "(import.*[{,[:space:]]${clean_name}[},:[:space:]]|import[[:space:]]+${clean_name}[[:space:]]+from)" . >/dev/null; then
              individual_unused+=("$file:$clean_name")
              echo "⚠️  Unused export '$clean_name' in: $file"
            fi
          fi
        done
        continue
      elif [[ "$export_line" =~ export[[:space:]]+default ]]; then
        export_name="default"
      else
        continue
      fi
      
      # Skip default exports and already processed exports
      if [[ "$export_name" == "default" ]]; then
        continue
      fi
      
      # Search for usage of this specific export
      if ! grep -R \
          --exclude-dir="node_modules" \
          --exclude="$file" \
          --include="*.ts" \
          --include="*.tsx" \
          -E "(import.*[{,[:space:]]${export_name}[},:[:space:]]|import[[:space:]]+${export_name}[[:space:]]+from)" . >/dev/null; then
        individual_unused+=("$file:$export_name")
        echo "⚠️  Unused export '$export_name' in: $file"
      fi
    done < <(grep -E "$EXPORT_REGEX" "$file")
  done < <(find "$ROOT_DIR" -type f \( -name "*.ts" -o -name "*.tsx" \) \
    -not -path "*/__tests__/*" \
    -not -path "*/*.test.ts" \
    -not -path "*/*.test.tsx" \
    -not -path "*/*.spec.ts" \
    -not -path "*/*.spec.tsx" \
    -not -path "*/node_modules/*")
  
  if [ ${#individual_unused[@]} -gt 0 ]; then
    echo "=> Found ${#individual_unused[@]} individual unused export(s)."
  else
    echo "✅ No individual unused exports found."
  fi
}

########################################
# FUNCTION: Find potential dead code patterns
########################################
find_dead_code_patterns() {
  echo
  echo "🔧 Scanning for potential dead code patterns…"
  
  echo "📁 Files with only commented code:"
  find "$ROOT_DIR" -name "*.ts" -o -name "*.tsx" | while read -r file; do
    # Check if file has only comments, whitespace, and imports
    if grep -v -E '^\s*(//|/\*|\*|import|export\s*\{?\s*\}?|$)' "$file" | grep -q .; then
      continue
    else
      echo "  ⚠️  $file (appears to be dead code)"
    fi
  done
  
  echo
  echo "🔍 Debug/test utility patterns:"
  find "$ROOT_DIR" -name "*.ts" -not -path "*/__tests__/*" -not -path "*/*.test.ts" | \
    xargs grep -l -E "(debugLocally|localContextTest|testSave|console\.log|\.only\()" 2>/dev/null | \
    head -n 10 || echo "  — no debug patterns found"
    
  echo
  echo "📦 Potentially unused external integrations:"
  find "$ROOT_DIR" -name "*.ts" -o -name "*.tsx" | while read -r file; do
    if grep -q "mem0\|lmnr\|laminar" "$file" 2>/dev/null; then
      echo "  ⚠️  $file (external service integration)"
    fi
  done
}

########################################
# FUNCTION: Generate cleanup suggestions
########################################
generate_cleanup_suggestions() {
  echo
  echo "💡 CLEANUP SUGGESTIONS:"
  echo "========================"
  echo
  echo "High Priority (Safe to remove):"
  echo "  • Files that export but are never imported"
  echo "  • Individual exports within files that are unused"
  echo "  • Commented-out code files"
  echo
  echo "Medium Priority (Review before removing):"
  echo "  • Debug utilities and console.log statements"
  echo "  • External service integrations (mem0, laminar)"
  echo "  • Type-only exports that may be framework requirements"
  echo
  echo "To remove unused files safely:"
  echo "  git rm \$UNUSED_FILE"
  echo
  echo "To remove individual exports:"
  echo "  # Edit the file and remove the export statement"
  echo "  # or prefix with underscore: export const _unusedVar = ..."
}

########################################
# MAIN
########################################
echo "🧹 TypeScript Unused Code Analysis"
echo "=================================="

# 1) Check unused module exports (whole files)
find_unused_exports
module_exit_code=$?

# 2) Check individual unused exports within files
find_unused_individual_exports

# 3) Find other dead code patterns
find_dead_code_patterns

# 4) Generate suggestions
generate_cleanup_suggestions

exit $module_exit_code
