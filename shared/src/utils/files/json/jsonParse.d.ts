/**
 * Try to pull a JSON/JSON5 object out of any AI-generated text.
 * @param input  only strings are allowed.
 * @returns      The first successfully parsed JSON object.
 * @throws       If no valid JSON or JSON5 could be extracted or if the result is an array.
 */
declare function extractJSON(input: unknown, throwIfError?: boolean): Record<string, unknown> | string;
export declare const isJSON: (str: unknown) => boolean;
export declare const show: (obj: unknown, indent?: number, depth?: number) => string;
export declare const JSONN: {
    extract: typeof extractJSON;
    isJSON: (str: unknown) => boolean;
    show: (obj: unknown, indent?: number, depth?: number) => string;
};
export {};
//# sourceMappingURL=jsonParse.d.ts.map