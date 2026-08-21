import path from "path";
import { readFile } from "fs/promises";
import {
  PDFDocument,
  PDFImage,
  PDFFont,
  PDFPage,
  StandardFonts,
  rgb,
} from "pdf-lib";

type ContactSettings = {
  businessName: string;
  tagline?: string | null;
  phone?: string | null;
  whatsapp?: string | null;
  email?: string | null;
  address?: string | null;
};

type PdfContext = PDFDocument & {
  __logoImage: PDFImage;
  __regularFont: PDFFont;
  __boldFont: PDFFont;
};

export type IssuedInvoicePdfInput = {
  invoiceNumber: string;
  invoiceStatusLabel: string;
  createdAt: string;
  validUntil: string;
  customer: {
    name: string;
    phone?: string | null;
    whatsapp?: string | null;
    email?: string | null;
    address?: string | null;
  };
  shipments: Array<{
    trackingNumber: string;
    description: string;
    containerNumber?: string | null;
    pricingBasis?: string | null;
    billableQuantity?: string | null;
    unitRateUsd?: string | null;
    lineTotalUsd: string;
    lineTotalGhs: string;
  }>;
  subtotalUsd: string;
  totalGhs: string;
  business: ContactSettings;
};

export type ReceiptPdfInput = {
  receiptNumber: string;
  paidAt: string;
  paymentMethod: string;
  paymentReference?: string | null;
  amountGhs: string;
  invoiceNumber: string;
  customerName: string;
  business: ContactSettings;
};

export async function generateIssuedInvoicePdf(
  input: IssuedInvoicePdfInput
) {
  const pdf = await createPdf();
  const page = pdf.addPage([595.28, 841.89]);
  const layout = createLayout(pdf, page);

  let y = layout.pageHeight - layout.margin;
  const logoSize = 58;
  const brandX = layout.margin + logoSize + 16;

  layout.page.drawImage(layout.logoImage, {
    x: layout.margin,
    y: layout.pageHeight - layout.margin - logoSize,
    width: logoSize,
    height: logoSize,
  });

  layout.drawText(input.business.businessName, brandX, y, {
    size: 22,
    bold: true,
  });
  layout.drawText("INVOICE", layout.pageWidth - layout.margin - 92, y, {
    size: 22,
    bold: true,
  });
  y -= 22;

  if (input.business.tagline) {
    layout.drawText(input.business.tagline, brandX, y, { size: 9 });
    y -= 14;
  }

  const contactLines = [
    input.business.phone ? `Phone: ${input.business.phone}` : null,
    input.business.whatsapp
      ? `WhatsApp: ${input.business.whatsapp}`
      : null,
    input.business.email ? `Email: ${input.business.email}` : null,
    input.business.address ? `Address: ${input.business.address}` : null,
  ].filter((value): value is string => Boolean(value));

  for (const line of contactLines) {
    layout.drawText(line, brandX, y, { size: 8.5 });
    y -= 12;
  }

  y -= 4;
  layout.drawLine(y);
  y -= 24;

  layout.drawText("Bill To", layout.margin, y, { size: 11, bold: true });
  layout.drawText(`Invoice #: ${input.invoiceNumber}`, 340, y, {
    size: 10,
    bold: true,
  });
  y -= 18;

  layout.drawText(input.customer.name, layout.margin, y, {
    size: 11,
    bold: true,
  });
  layout.drawText(`Date: ${input.createdAt}`, 340, y);
  y -= 18;
  layout.drawText(`Valid Until: ${input.validUntil}`, 340, y);
  y -= 18;
  layout.drawText(`Status: ${input.invoiceStatusLabel}`, 340, y, {
    size: 9,
    bold: true,
  });
  y -= 24;

  if (input.customer.phone) {
    layout.drawText(`Phone: ${input.customer.phone}`, layout.margin, y, {
      size: 9,
    });
    y -= 12;
  }

  if (input.customer.whatsapp) {
    layout.drawText(`WhatsApp: ${input.customer.whatsapp}`, layout.margin, y, {
      size: 9,
    });
    y -= 12;
  }

  if (input.customer.email) {
    layout.drawText(`Email: ${input.customer.email}`, layout.margin, y, {
      size: 9,
    });
    y -= 12;
  }

  if (input.customer.address) {
    layout.drawText(`Address: ${input.customer.address}`, layout.margin, y, {
      size: 9,
    });
    y -= 12;
  }

  y -= 8;
  layout.drawLine(y);
  y -= 18;

  layout.drawText("Charges", layout.margin, y, {
    size: 11,
    bold: true,
  });
  y -= 16;
  layout.drawLine(y);
  y -= 12;

  for (const shipment of input.shipments) {
    if (y < 120) {
      pdf.addPage([595.28, 841.89]);
      y = layout.pageHeight - layout.margin;
    }

    layout.drawText(`Tracking: ${shipment.trackingNumber}`, layout.margin, y, {
      size: 8.5,
      bold: true,
    });
    layout.drawText(`Description: ${shipment.description}`, layout.margin, y - 14, {
      size: 8.2,
    });
    layout.drawText(`Basis: ${shipment.pricingBasis ?? "—"}`, 300, y, {
      size: 8.2,
    });
    layout.drawText(`Qty: ${shipment.billableQuantity ?? "—"}`, 300, y - 14, {
      size: 8.2,
    });
    layout.drawText(`Total USD: $${shipment.lineTotalUsd}`, 430, y, {
      size: 8.2,
    });
    layout.drawText(`Total GHS: GHS ${shipment.lineTotalGhs}`, 430, y - 14, {
      size: 8.2,
    });
    if (shipment.containerNumber) {
      layout.drawText(`Container: ${shipment.containerNumber}`, layout.margin, y - 28, {
        size: 8.2,
      });
      y -= 44;
    } else {
      y -= 36;
    }
  }

  layout.drawLine(y);
  y -= 18;

  layout.drawText(`Subtotal USD: $${input.subtotalUsd}`, 330, y, {
    size: 11,
    bold: true,
  });
  y -= 14;
  layout.drawText(`Total GHS: GHS ${input.totalGhs}`, 330, y, {
    size: 12,
    bold: true,
  });

  return pdf.save();
}

export async function generateReceiptPdf(
  input: ReceiptPdfInput
) {
  const pdf = await createPdf();
  const page = pdf.addPage([595.28, 841.89]);
  const layout = createLayout(pdf, page);

  let y = layout.pageHeight - layout.margin;
  const logoSize = 54;
  const brandX = layout.margin + logoSize + 16;

  layout.page.drawImage(layout.logoImage, {
    x: layout.margin,
    y: layout.pageHeight - layout.margin - logoSize,
    width: logoSize,
    height: logoSize,
  });

  layout.drawText(input.business.businessName, brandX, y, {
    size: 22,
    bold: true,
  });
  layout.drawText("RECEIPT", layout.pageWidth - layout.margin - 92, y, {
    size: 22,
    bold: true,
  });
  y -= 22;

  if (input.business.tagline) {
    layout.drawText(input.business.tagline, brandX, y, { size: 9 });
    y -= 14;
  }

  layout.drawLine(y);
  y -= 24;

  layout.drawText(`Receipt #: ${input.receiptNumber}`, layout.margin, y, {
    size: 12,
    bold: true,
  });
  layout.drawText(`Invoice #: ${input.invoiceNumber}`, 320, y, {
    size: 10,
    bold: true,
  });
  y -= 18;
  layout.drawText(`Customer: ${input.customerName}`, layout.margin, y, {
    size: 11,
  });
  y -= 18;
  layout.drawText(`Paid At: ${input.paidAt}`, layout.margin, y, {
    size: 10,
  });
  layout.drawText(`Method: ${input.paymentMethod}`, 320, y, {
    size: 10,
  });
  y -= 18;

  if (input.paymentReference) {
    layout.drawText(`Reference: ${input.paymentReference}`, layout.margin, y, {
      size: 10,
    });
    y -= 18;
  }

  layout.drawLine(y);
  y -= 18;
  layout.drawText(`Amount Received: GHS ${input.amountGhs}`, layout.margin, y, {
    size: 14,
    bold: true,
  });

  return pdf.save();
}

async function createPdf() {
  const pdf = await PDFDocument.create();
  const logoBytes = await readFile(
    path.join(process.cwd(), "public", "willis-log.png")
  );
  const logoImage = await pdf.embedPng(logoBytes);
  const regularFont = await pdf.embedFont(StandardFonts.Helvetica);
  const boldFont = await pdf.embedFont(StandardFonts.HelveticaBold);

  return Object.assign(pdf, {
    __logoImage: logoImage,
    __regularFont: regularFont,
    __boldFont: boldFont,
  }) as PdfContext;
}

function createLayout(pdf: PdfContext, page: PDFPage) {
  const pageWidth = page.getWidth();
  const pageHeight = page.getHeight();
  const margin = 48;

  return {
    pdf,
    page,
    pageWidth,
    pageHeight,
    margin,
    logoImage: pdf.__logoImage,
    drawText(
      text: string | null | undefined,
      x: number,
      y: number,
      options?: { size?: number; bold?: boolean }
    ) {
      page.drawText(text ?? "", {
        x,
        y,
        size: options?.size ?? 10,
        font: options?.bold ? pdf.__boldFont : pdf.__regularFont,
        color: rgb(0.08, 0.08, 0.08),
      });
    },
    drawLine(y: number) {
      page.drawLine({
        start: { x: margin, y },
        end: { x: pageWidth - margin, y },
        thickness: 0.7,
        color: rgb(0.82, 0.82, 0.82),
      });
    },
  };
}
