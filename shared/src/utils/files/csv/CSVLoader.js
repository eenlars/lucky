import { readFileSync } from "fs";
import Papa from "papaparse";
import { dirname, join } from "path";
import { fileURLToPath } from "url";
export class CSVLoader {
    constructor(filePath, options = {}) {
        this.filePath = filePath;
        this.options = Object.assign({ hasHeaders: true, skipEmptyLines: true }, options);
    }
    // load csv as raw string content
    async loadAsString() {
        try {
            const csvContent = await this.loadContent();
            if (!this.options.hasHeaders) {
                return csvContent;
            }
            const parsed = Papa.parse(csvContent, { header: false });
            return parsed.data.map((row) => row.join(",")).join("\n");
        }
        catch (error) {
            throw new Error(`failed to load csv as string from ${this.filePath}: ${error}`);
        }
    }
    // load csv as parsed json data with optional column mapping
    async loadAsJSON() {
        try {
            const csvContent = await this.loadContent();
            const parsed = Papa.parse(csvContent, {
                header: this.options.hasHeaders,
                skipEmptyLines: this.options.skipEmptyLines,
            });
            if (!this.options.hasHeaders) {
                let data = parsed.data;
                // if onlyIncludeInputColumns is provided and data is array of arrays, filter by index
                if (this.options.onlyIncludeInputColumns && Array.isArray(data[0])) {
                    const columnIndices = this.options.onlyIncludeInputColumns
                        .map((col) => parseInt(col))
                        .filter((index) => !isNaN(index));
                    if (columnIndices.length > 0) {
                        data = data.map((row) => columnIndices.map((index) => row[index]));
                    }
                }
                return data;
            }
            return parsed.data
                .map((row) => this.mapColumns(row))
                .map((row) => this.filterColumns(row))
                .filter((item) => this.isValidRow(item));
        }
        catch (error) {
            throw new Error(`failed to load csv as json from ${this.filePath}: ${error}`);
        }
    }
    // map columns based on column mappings
    mapColumns(row) {
        if (!this.options.columnMappings) {
            return row;
        }
        const mapped = {};
        for (const [targetField, possibleNames] of Object.entries(this.options.columnMappings)) {
            let value = "";
            // find first matching column name
            for (const name of possibleNames) {
                if (row[name] !== undefined && row[name] !== null && row[name] !== "") {
                    value = row[name];
                    break;
                }
            }
            mapped[targetField] = value;
        }
        return mapped;
    }
    // filter columns to only include specified columns
    filterColumns(row) {
        if (!this.options.onlyIncludeInputColumns) {
            return row;
        }
        const filtered = {};
        for (const column of this.options.onlyIncludeInputColumns) {
            if (row[column] !== undefined) {
                filtered[column] = row[column];
            }
        }
        return filtered;
    }
    // check if row has required data
    isValidRow(item) {
        if (!this.options.columnMappings) {
            return true;
        }
        // at least one mapped field should have a value
        return Object.keys(this.options.columnMappings).some((field) => item[field] && item[field] !== "");
    }
    // helper method to load content from file or url
    async loadContent() {
        if (this.filePath.startsWith("http://") ||
            this.filePath.startsWith("https://")) {
            // fetch from url
            const response = await fetch(this.filePath);
            if (!response.ok) {
                throw new Error(`failed to fetch csv from ${this.filePath}: ${response.status} ${response.statusText}`);
            }
            return await response.text();
        }
        else {
            // read from local file
            return readFileSync(this.filePath, "utf-8");
        }
    }
    // static factory method for creating loader with relative path to this module
    static fromRelativePath(relativePath, options) {
        const __filename = fileURLToPath(import.meta.url);
        const __dirname = dirname(__filename);
        const fullPath = join(__dirname, relativePath);
        return new CSVLoader(fullPath, options);
    }
}
