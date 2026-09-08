export function normalizeText(value: string) {
  return value
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-zA-Z0-9]+/g, " ")
    .trim()
    .replace(/\s+/g, " ")
    .toUpperCase();
}

export function sanitizeFilename(value: string) {
  const extension = value.toLowerCase().endsWith(".pdf") ? ".pdf" : "";
  const stem = normalizeText(value.replace(/\.pdf$/i, ""))
    .toLowerCase()
    .replace(/\s+/g, "-")
    .slice(0, 80);
  return `${stem || "fatura"}${extension}`;
}
