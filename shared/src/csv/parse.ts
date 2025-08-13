import Papa from "papaparse"

export function parseCsv(input: string) {
  return Papa.parse(input, { header: true, skipEmptyLines: true })
}
