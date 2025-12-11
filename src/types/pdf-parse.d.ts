declare module "pdf-parse/node" {
    interface PDFData {
        numpages: number;
        numrender: number;
        info: Record<string, unknown>;
        metadata: Record<string, unknown> | null;
        text: string;
        version: string;
    }

    interface PDFOptions {
        pagerender?: (pageData: unknown) => Promise<string>;
        max?: number;
        version?: string;
    }

    export function pdfParse(dataBuffer: Buffer, options?: PDFOptions): Promise<PDFData>;
    export function parseFromFile(filePath: string, options?: PDFOptions): Promise<PDFData>;
    export function parseFromUrl(url: string, options?: PDFOptions): Promise<PDFData>;
}

declare module "pdf-parse" {
    export * from "pdf-parse/node";
}
