import path from "path";
import { mkdir, readFile, writeFile } from "fs/promises";

export function buildInvoiceDocumentStoragePath(input: {
  customerId: string;
  customerName: string;
  invoiceNumber: string;
}) {
  const safeCustomerName = slugify(input.customerName);

  return path.join(
    process.cwd(),
    "storage",
    "invoices",
    `${input.customerId}-${safeCustomerName}`,
    input.invoiceNumber,
    `${input.invoiceNumber}.pdf`
  );
}

export async function savePdfBytes(
  storagePath: string,
  bytes: Uint8Array
) {
  await mkdir(path.dirname(storagePath), {
    recursive: true,
  });

  await writeFile(storagePath, bytes);
}

export async function readPdfBytes(storagePath: string) {
  try {
    return await readFile(storagePath);
  } catch {
    return null;
  }
}

function slugify(value: string) {
  return value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 60) || "customer";
}
