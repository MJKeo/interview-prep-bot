import stripRtf from "@sigma/striprtf";
import { htmlToText } from "html-to-text";
import Papa from 'papaparse';
import mammoth from "mammoth";
import { extractText, getDocumentProxy } from "unpdf";
import Tesseract from "tesseract.js";

/**
 * Maximum allowed file size in bytes (10MB)
 */
const MAX_FILE_SIZE_BYTES = 10 * 1024 * 1024; // 10MB

enum SupportedFileTypeCategory {
  TEXT = "text", // DONE
  RTF = "rtf", // DONE
  HTML = "html", // DONE
  IMAGE = "image",
  PDF = "pdf", // DONE
  DOC = "doc", // DONE
  JSON = "json", // DONE
  CSV = "csv", // DONE
}

type SupportedFileData = {
  extensions: string[];
  category: SupportedFileTypeCategory;
}

const supportedFileTypesDataMap: Record<string, SupportedFileData> = {
    "application/pdf": { extensions: [".pdf"], category: SupportedFileTypeCategory.PDF },
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document": { extensions: [".docx"], category: SupportedFileTypeCategory.DOC },
    "text/rtf": { extensions: [".rtf"], category: SupportedFileTypeCategory.RTF },
    "text/plain": { extensions: [".txt"], category: SupportedFileTypeCategory.TEXT },
    "text/html": { extensions: [".html"], category: SupportedFileTypeCategory.HTML },
    "text/markdown": { extensions: [".md"], category: SupportedFileTypeCategory.TEXT },
    "text/csv": { extensions: [".csv"], category: SupportedFileTypeCategory.CSV },
    "application/json": { extensions: [".json"], category: SupportedFileTypeCategory.JSON },
    "image/png": { extensions: [".png"], category: SupportedFileTypeCategory.IMAGE },
    "image/jpeg": { extensions: [".jpg", ".jpeg"], category: SupportedFileTypeCategory.IMAGE },
};

export const supportedFileTypes = Object.values(supportedFileTypesDataMap).flatMap(data => data.extensions).join(",");

/**
 * Wraps a promise with a timeout. If the promise doesn't resolve within the timeout,
 * it rejects with an error.
 * @param promise The promise to wrap with a timeout
 * @param timeoutMs The timeout duration in milliseconds
 * @returns A promise that either resolves with the original value or rejects on timeout
 */
function withTimeout<T>(promise: Promise<T>, timeoutMs: number): Promise<T> {
  return Promise.race([
    promise,
    new Promise<T>((_, reject) => {
      setTimeout(() => {
        reject(new Error(`Operation timed out after ${timeoutMs}ms`));
      }, timeoutMs);
    }),
  ]);
}

/**
 * Parses a file and extracts its text content.
 * Supports various file types including PDF, DOCX, RTF, HTML, images, JSON, CSV, and plain text.
 * All parsing operations have a 10-second timeout.
 * Files must be 10MB or less in size.
 * @param file The file to parse
 * @returns A promise that resolves to the extracted text content, or null if the file type is not supported
 * @throws Error if the file size exceeds 10MB
 */
export async function parseFile(file: File): Promise<string | null> {
  // Check file size before processing
  if (file.size > MAX_FILE_SIZE_BYTES) {
    throw new Error("File must be 10MB or less");
  }

  const fileData = supportedFileTypesDataMap[file.type];
  if (!fileData) {
    return null;
  }

  // Wrap the parsing operation with a 10-second timeout
  const parseOperation = (async () => {
    switch (fileData.category) {
      case SupportedFileTypeCategory.TEXT:
        return await readFileAsText(file);
      case SupportedFileTypeCategory.RTF:
        return await rtfFileToText(file);
      case SupportedFileTypeCategory.HTML:
        return await htmlFileToText(file);
      case SupportedFileTypeCategory.IMAGE:
        return await extractImageText(file);
      case SupportedFileTypeCategory.PDF:
        return await extractPdfText(file);
      case SupportedFileTypeCategory.DOC:
        return await extractDocxText(file);
      case SupportedFileTypeCategory.JSON:
        return await jsonFileToText(file);
      case SupportedFileTypeCategory.CSV:
        return await csvFileToText(file);
      default:
        return null;
    }
  })();

  try {
    return await withTimeout(parseOperation, 10000); // 10 second timeout
  } catch (error) {
    // Timeout or other parsing errors are caught and re-thrown
    // The caller will handle the error and display the error status
    throw error;
  }
}

function readFileAsText(file: File): Promise<string> {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();

        reader.onload = (e) => resolve(e.target!.result as string);
        reader.onerror = () => reject(reader.error);

        reader.readAsText(file); // <-- reads the text content
    });
}


async function rtfFileToText(file: File): Promise<string> {
    return stripRtf(await file.text());
}

async function jsonFileToText(file: File): Promise<string> {
    return JSON.parse(await file.text());
}

async function htmlFileToText(file: File): Promise<string> {
    return htmlToText(await file.text());
}

async function csvFileToText(file: File): Promise<string> {
    return JSON.stringify(Papa.parse(await file.text(), { header: true }).data);
}

async function extractPdfText(file: File): Promise<string> {
    // 1) Read the file in the browser
    const arrayBuffer = await file.arrayBuffer();

    // 2) Create a PDF.js document using unpdf
    const pdf = await getDocumentProxy(new Uint8Array(arrayBuffer));

    // 3) Extract text from all pages, merged into one string
    const result = await extractText(pdf, { mergePages: true });
    return result.text;
}

async function extractDocxText(file: File): Promise<string> {
    const arrayBuffer = await file.arrayBuffer();
    const result = await mammoth.extractRawText({ arrayBuffer });
    return result.value;
}

async function extractImageText(file: File): Promise<string> {
    const imageUrl = URL.createObjectURL(file);

    try {
      const { data } = await Tesseract.recognize(imageUrl, "eng");
      return data.text;
    } finally {
      URL.revokeObjectURL(imageUrl);
    }
}