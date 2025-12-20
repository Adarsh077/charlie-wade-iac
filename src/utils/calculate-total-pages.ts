import { PDFDocument } from "pdf-lib";
import fetch from "node-fetch";

interface PdfResult {
  link: string;
  pageCount: number;
  fileName: string;
}

async function downloadAndProcessPDF(url: string): Promise<PdfResult | null> {
  try {
    const response = await fetch(url);
    const buffer = await response.arrayBuffer();

    const pdfDoc = await PDFDocument.load(buffer);
    const pageCount = pdfDoc.getPageCount();

    const filenameSegment = url.split("/").pop() ?? "";
    const fileName = filenameSegment.split("-pdf.")[0];

    return { link: url, pageCount, fileName };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    console.error(`Error processing PDF from ${url}: ${errorMessage}`);
    return null;
  }
}

async function main(urls: string[]): Promise<PdfResult[] | undefined> {
  try {
    const results = [];

    for (const url of urls) {
      const result = await downloadAndProcessPDF(url);
      if (result) results.push(result);
    }

    const validResults = results.filter(
      (result): result is PdfResult => result !== null
    );

    console.log("Process completed successfully.");

    return validResults;
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    console.error(`Error: ${errorMessage}`);
    return undefined;
  }
}

export default main;
