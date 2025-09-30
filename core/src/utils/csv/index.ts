/**
 * CSV utilities for standalone core.
 * Copied from @lucky/shared for independence.
 */

import Papa from "papaparse"

export function parseCsv(input: string) {
  return Papa.parse(input, { header: true, skipEmptyLines: true })
}