import "server-only";
import * as pdfjs from "pdfjs-dist/legacy/build/pdf.mjs";
import type { ExtractedDocument } from "./contracts";
import { AppError } from "@/shared/lib/result";

const MIN_TEXT_PER_PAGE = 40;
const MAX_RENDER_PIXELS = 20_000_000;
const OCR_TIMEOUT_MS = 45_000;

function pageText(items: ReadonlyArray<unknown>) {
  const rows = new Map<number, Array<{ x: number; text: string }>>();
  for (const value of items) {
    if (!value || typeof value !== "object" || !("str" in value)) continue;
    const item = value as { str: unknown; transform?: number[] };
    if (typeof item.str !== "string" || !item.str.trim()) continue;
    // PDF text operators are not required to be emitted in visual reading
    // order. Grouping by baseline and then sorting horizontally keeps table
    // rows intact (notably the current Nubank invoice layout).
    const y = Math.round((item.transform?.[5] ?? 0) * 2) / 2;
    const row = rows.get(y) ?? [];
    row.push({ x: item.transform?.[4] ?? 0, text: item.str.trim() });
    rows.set(y, row);
  }
  return [...rows.entries()]
    .sort(([left], [right]) => right - left)
    .map(([, row]) => row.sort((left, right) => left.x - right.x).map((item) => item.text).join(" "))
    .join("\n")
    .replace(/[ \t]+/g, " ")
    .replace(/ *\n */g, "\n")
    .trim();
}

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

export async function extractDocument(data: Uint8Array): Promise<ExtractedDocument> {
  // pdfjs can transfer the supplied ArrayBuffer to its worker. Give it an
  // owned copy so a platform-specific stream implementation cannot detach the
  // bytes that were just read from private storage.
  const loadingTask = pdfjs.getDocument({
    data: data.slice(),
    useWorkerFetch: false,
    disableAutoFetch: true,
    disableRange: true,
    disableStream: true,
  });
  let pdf: Awaited<typeof loadingTask.promise>;
  try {
    pdf = await loadingTask.promise;
  } catch (error) {
    if (error instanceof Error && error.name === "PasswordException") throw new AppError("UNSUPPORTED_PDF", "PDFs protegidos por senha ainda não são suportados.");
    if (error instanceof Error && error.name === "InvalidPDFException") throw new AppError("INVALID_PDF", "Não foi possível abrir este PDF.");
    throw new AppError("IMPORT_FAILED", "Não foi possível iniciar a leitura deste PDF. Tente reprocessar a importação.", 500);
  }
  if (pdf.numPages > 100) throw new AppError("INVALID_PDF", "O PDF excede o limite de 100 páginas.");

  const pages: string[] = [];
  let usedOcr = false;
  let worker: Awaited<ReturnType<(typeof import("tesseract.js"))["createWorker"]>> | undefined;
  try {
    for (let number = 1; number <= pdf.numPages; number += 1) {
      const page = await pdf.getPage(number);
      const content = await page.getTextContent();
      let text = pageText(content.items);
      if (text.length < MIN_TEXT_PER_PAGE) {
        usedOcr = true;
        const [{ createWorker }, { createCanvas }] = await Promise.all([
          import("tesseract.js"),
          import("@napi-rs/canvas"),
        ]);
        worker ??= await createWorker(["por", "eng"]);
        const viewport = page.getViewport({ scale: 2 });
        if (viewport.width * viewport.height > MAX_RENDER_PIXELS) throw new AppError("INVALID_PDF", "Uma página do PDF possui dimensões acima do limite seguro.");
        const canvas = createCanvas(Math.ceil(viewport.width), Math.ceil(viewport.height));
        const context = canvas.getContext("2d");
        await page.render({ canvas: canvas as unknown as HTMLCanvasElement, canvasContext: context as unknown as CanvasRenderingContext2D, viewport }).promise;
        const recognition = await withTimeout(worker.recognize(canvas.toBuffer("image/png")), OCR_TIMEOUT_MS);
        text = recognition.data.text.replace(/[ \t]+/g, " ").replace(/ *\r?\n */g, "\n").trim();
      }
      pages.push(text);
    }
  } finally {
    await worker?.terminate();
    await loadingTask.destroy();
  }
  return { pages, text: pages.join("\n"), usedOcr };
}
