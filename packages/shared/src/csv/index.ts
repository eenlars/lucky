import Papa from "papaparse"
export { CSVLoader } from "./CSVLoader"

export function parseCsv(input: string) {
  return Papa.parse(input, { header: true, skipEmptyLines: true })
}
