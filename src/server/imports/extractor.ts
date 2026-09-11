import "server-only";
import { extractText, getDocumentProxy, renderPageAsImage } from "unpdf";
import type { ExtractedDocument } from "./contracts";
import { AppError } from "@/shared/lib/result";

const MIN_TEXT_PER_PAGE = 40;
const MAX_RENDERED_IMAGE_BYTES = 20_000_000 * 4;
const OCR_TIMEOUT_MS = 45_000;

async function withTimeout<T>(promise: Promise<T>, milliseconds: number) {
  let timeout: ReturnType<typeof setTimeout> | undefined;
  try {
    return await Promise.race<T>([
      promise,
      new Promise<T>((_, reject) => {
        timeout = setTimeout(
          () => reject(new AppError("UNSUPPORTED_PDF", "O OCR desta página excedeu o tempo permitido.")),
          milliseconds,
        );
      }),
    ]);
  } finally {
    if (timeout) clearTimeout(timeout);
  }
}

function normalizePageText(value: string) {
  return value.replace(/[ \t]+/g, " ").replace(/ *\r?\n */g, "\n").trim();
}

export async function extractDocument(data: Uint8Array, options: { password?: string } = {}): Promise<ExtractedDocument> {
  let pdf: Awaited<ReturnType<typeof getDocumentProxy>>;
  try {
    // unpdf includes a PDF.js build compiled for serverless runtimes. This
    // avoids the worker and DOM assumptions of the full PDF.js legacy build.
    pdf = await getDocumentProxy(data.slice(), options.password === undefined ? {} : { password: options.password });
  } catch (error) {
    const signature = error instanceof Error ? `${error.name} ${error.message}` : "";
    const passwordCode = typeof error === "object" && error !== null && "code" in error
      ? Number((error as { code?: unknown }).code)
      : undefined;
    if (passwordCode === 1 || (/password/i.test(signature) && options.password === undefined)) {
      throw new AppError("PDF_PASSWORD_REQUIRED", "Este PDF exige senha para ser aberto.", 422);
    }
    if (passwordCode === 2 || /incorrect password/i.test(signature)) {
      throw new AppError("PDF_PASSWORD_INVALID", "A senha informada para o PDF está incorreta.", 422);
    }
    if (/invalid.*pdf|format/i.test(signature)) throw new AppError("INVALID_PDF", "Não foi possível abrir este PDF.");
    throw new AppError("IMPORT_FAILED", "Não foi possível iniciar a leitura deste PDF. Tente reprocessar a importação.", 500);
  }

  if (pdf.numPages > 100) {
    await pdf.destroy();
    throw new AppError("INVALID_PDF", "O PDF excede o limite de 100 páginas.");
  }

  let pages: string[];
  try {
    const extracted = await extractText(pdf);
    pages = extracted.text.map(normalizePageText);
  } catch {
    await pdf.destroy();
    throw new AppError("IMPORT_FAILED", "Não foi possível extrair o texto deste PDF. Tente reprocessar a importação.", 500);
  }

  let usedOcr = false;
  let worker: Awaited<ReturnType<(typeof import("tesseract.js"))["createWorker"]>> | undefined;
  try {
    for (let number = 1; number <= pages.length; number += 1) {
      let text = pages[number - 1] ?? "";
      if (text.length >= MIN_TEXT_PER_PAGE) continue;

      usedOcr = true;
      const { createWorker } = await import("tesseract.js");
      worker ??= await createWorker(["por", "eng"]);
      const image = await renderPageAsImage(pdf, number, {
        scale: 2,
        canvasImport: () => import("@napi-rs/canvas"),
      });
      if (image.byteLength > MAX_RENDERED_IMAGE_BYTES) {
        throw new AppError("INVALID_PDF", "Uma página do PDF possui dimensões acima do limite seguro.");
      }
      const recognition = await withTimeout(worker.recognize(Buffer.from(image)), OCR_TIMEOUT_MS);
      text = normalizePageText(recognition.data.text);
      pages[number - 1] = text;
    }
  } finally {
    await worker?.terminate();
    await pdf.destroy();
  }

  return { pages, text: pages.join("\n"), usedOcr };
}
