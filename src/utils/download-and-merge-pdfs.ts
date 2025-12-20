import { Resource } from "sst";
import axios, { AxiosResponse } from "axios";
import { PDFDocument } from "pdf-lib";
import { S3Client, PutObjectCommand } from "@aws-sdk/client-s3";

// --- Types ---
interface ChapterItem {
  fileName: string;
  links: string[];
}

interface ProcessResult {
  fileName: string;
  status: "success" | "error";
  s3Key?: string;
  error?: string;
}

// --- Init S3 Client (Outside Handler) ---
const s3Client = new S3Client({});

/**
 * Helper: Download PDF as a Buffer with retry logic
 */
async function downloadPdf(url: string, retries: number = 3): Promise<Buffer> {
  for (let i = 0; i < retries; i++) {
    try {
      const response: AxiosResponse<ArrayBuffer> = await axios.get(url, {
        responseType: "arraybuffer", // Important: get raw binary data
        timeout: 10000,
        headers: { "User-Agent": "Mozilla/5.0" },
      });
      return Buffer.from(response.data);
    } catch (error) {
      if (i === retries - 1) throw error;
      await new Promise((r) => setTimeout(r, 1000));
    }
  }
  throw new Error(`Failed to download ${url} after retries`);
}

/**
 * Core Logic: Downloads, Merges, and Uploads to S3
 */
async function processChapters(data: ChapterItem[]): Promise<ProcessResult[]> {
  const BUCKET_NAME = Resource.CharlieWadeBucket.name;

  if (!BUCKET_NAME) {
    throw new Error("Environment variable BUCKET_NAME is not set.");
  }

  const results: ProcessResult[] = [];

  for (const item of data) {
    console.log(`Processing: ${item.fileName}`);

    const s3Key = item.fileName;

    try {
      // --- Step 1: Create Master PDF ---
      const mergedPdfDoc = await PDFDocument.create();

      // --- Step 2: Download & Merge Pages Sequentially ---
      for (const link of item.links) {
        try {
          const pdfBuffer = await downloadPdf(link);

          // Load the source PDF
          const sourcePdfDoc = await PDFDocument.load(pdfBuffer);

          // Copy all pages from source to master
          const copiedPages = await mergedPdfDoc.copyPages(
            sourcePdfDoc,
            sourcePdfDoc.getPageIndices()
          );

          copiedPages.forEach((page) => mergedPdfDoc.addPage(page));
        } catch (err: any) {
          console.warn(`Skipping page in ${item.fileName}: ${err.message}`);
        }
      }

      const pdfBytes = await mergedPdfDoc.save();
      const uploadBuffer = Buffer.from(pdfBytes);

      await s3Client.send(
        new PutObjectCommand({
          Bucket: BUCKET_NAME,
          Key: s3Key,
          Body: uploadBuffer,
          ContentType: "application/pdf",
        })
      );

      console.log(`Uploaded: s3://${BUCKET_NAME}/${s3Key}`);
      results.push({ fileName: item.fileName, status: "success", s3Key });
    } catch (err: any) {
      console.error(`Failed ${item.fileName}:`, err);
      results.push({
        fileName: item.fileName,
        status: "error",
        error: err.message,
      });
    }
  }

  return results;
}

export const downloadAndMergePdf = async (data: ChapterItem[]) => {
  try {
    return await processChapters(data);
  } catch (error) {
    console.log("downloadAndMergePdf", error);
  }
};
