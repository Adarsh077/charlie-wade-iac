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
    const CONCURRENCY_LIMIT = 10;

    // Loop through the URLs in steps of 5
    for (let i = 0; i < urls.length; i += CONCURRENCY_LIMIT) {
      const chunk = urls.slice(i, i + CONCURRENCY_LIMIT);

      console.log(
        `Processing batch ${Math.floor(i / CONCURRENCY_LIMIT) + 1}...`
      );

      // 1. Map the chunk to an array of Promises
      const batchPromises = chunk.map((url) => {
        console.log(`Downloading ${url}`);
        return downloadAndProcessPDF(url);
      });

      // 2. Wait for all 5 requests in this batch to resolve
      const batchResults = await Promise.all(batchPromises);

      // 3. Add results to the main array
      results.push(...batchResults);
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
