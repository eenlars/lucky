export interface CSVLoaderOptions {
    hasHeaders?: boolean;
    skipEmptyLines?: boolean;
    columnMappings?: Record<string, string[]>;
    onlyIncludeInputColumns?: string[];
}
export declare class CSVLoader {
    private filePath;
    private options;
    constructor(filePath: string, options?: CSVLoaderOptions);
    loadAsString(): Promise<string>;
    loadAsJSON<T = Record<string, any>>(): Promise<T[]>;
    private mapColumns;
    private filterColumns;
    private isValidRow;
    private loadContent;
    static fromRelativePath(relativePath: string, options?: CSVLoaderOptions): CSVLoader;
}
//# sourceMappingURL=CSVLoader.d.ts.map