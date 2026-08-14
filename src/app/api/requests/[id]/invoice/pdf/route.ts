import { PDFDocument, StandardFonts, rgb, type PDFPage } from "pdf-lib";
import { prisma } from "@/lib/prisma";

type RouteContext = {
  params: Promise<{
    id: string;
  }>;
};

type InvoicePdfData = NonNullable<Awaited<ReturnType<typeof loadInvoiceData>>>;

type PdfLayout = {
  x: number;
  y: number;
  regularFont: Awaited<ReturnType<PDFDocument["embedFont"]>>;
  boldFont: Awaited<ReturnType<PDFDocument["embedFont"]>>;
};

export async function GET(
  _request: Request,
  context: RouteContext
) {
  const { id } = await context.params;
  const invoiceData = await loadInvoiceData(id);

  if (!invoiceData) {
    return Response.json(
      { ok: false, message: "Invoice not found." },
      { status: 404 }
    );
  }

  const pdfBytes = await buildInvoicePdf(invoiceData);

  return new Response(pdfBytes, {
    status: 200,
    headers: buildPdfHeaders(invoiceData.invoice.invoiceNumber),
  });
}

async function loadInvoiceData(id: string) {
  const [customerRequest, businessSettings] = await Promise.all([
    prisma.customerRequest.findUnique({
      where: { id },
      include: { invoice: true },
    }),
    prisma.businessSettings.findFirst(),
  ]);

  if (!customerRequest || !customerRequest.invoice) {
    return null;
  }

  return {
    customerRequest,
    businessSettings,
    invoice: customerRequest.invoice,
  };
}

async function buildInvoicePdf(invoiceData: InvoicePdfData) {
  const { customerRequest, businessSettings, invoice } = invoiceData;

  const businessName =
    businessSettings?.businessName ?? "WILLIS PORT";
  const tagline =
    businessSettings?.tagline ?? "Shipping & Logistics";
  const phone = businessSettings?.phone ?? "Not configured";
  const whatsapp = businessSettings?.whatsapp ?? "Not configured";
  const email = businessSettings?.email ?? "Not configured";
  const address = businessSettings?.address ?? "Not configured";

  const pdf = await PDFDocument.create();
  const page = pdf.addPage([595.28, 841.89]);

  const regularFont = await pdf.embedFont(StandardFonts.Helvetica);
  const boldFont = await pdf.embedFont(StandardFonts.HelveticaBold);

  const layout: PdfLayout = {
    x: 48,
    y: page.getSize().height - 48,
    regularFont,
    boldFont,
  };

  drawBrandHeader(page, layout, businessName, tagline, phone, whatsapp, email, address);
  drawInvoiceMeta(page, layout, invoice.invoiceNumber, invoice.validUntil);
  drawCustomerSection(page, layout, customerRequest);
  drawShipmentSection(page, layout, customerRequest);
  drawPricingSection(page, layout, invoice);
  drawTotalsSection(page, layout, invoice);
  drawFooter(page, layout);

  return pdf.save();
}

function buildPdfHeaders(invoiceNumber: string) {
  return {
    "Content-Type": "application/pdf",
    "Content-Disposition": `inline; filename="${invoiceNumber}.pdf"`,
    "Cache-Control": "private, no-store",
  };
}

function drawBrandHeader(
  page: PDFPage,
  layout: PdfLayout,
  businessName: string,
  tagline: string,
  phone: string,
  whatsapp: string,
  email: string,
  address: string
) {
  const { x, boldFont, regularFont } = layout;
  let y = layout.y;
  const right = page.getWidth() - 48;

  page.drawText(businessName, {
    x,
    y,
    size: 25,
    font: boldFont,
    color: rgb(0.95, 0.35, 0.05),
  });

  page.drawText("INVOICE", {
    x: right - 95,
    y: y + 2,
    size: 20,
    font: boldFont,
  });

  y -= 22;

  page.drawText(tagline, {
    x,
    y,
    size: 10,
    font: regularFont,
  });

  y -= 16;

  page.drawText(`Phone: ${phone}`, {
    x,
    y,
    size: 9,
    font: regularFont,
  });

  page.drawText(`WhatsApp: ${whatsapp}`, {
    x: 300,
    y,
    size: 9,
    font: regularFont,
  });

  y -= 14;

  page.drawText(`Email: ${email}`, {
    x,
    y,
    size: 9,
    font: regularFont,
  });

  page.drawText(`Address: ${address}`, {
    x: 300,
    y,
    size: 9,
    font: regularFont,
  });

  y -= 20;

  page.drawLine({
    start: { x, y },
    end: { x: right, y },
    thickness: 1,
    color: rgb(0.9, 0.9, 0.9),
  });

  layout.y = y - 28;
}

function drawInvoiceMeta(
  page: PDFPage,
  layout: PdfLayout,
  invoiceNumber: string,
  validUntil: Date
) {
  const { x, boldFont, regularFont } = layout;
  let y = layout.y;

  page.drawText("INVOICE DETAILS", {
    x,
    y,
    size: 11,
    font: boldFont,
  });

  page.drawText("BILL TO", {
    x: 310,
    y,
    size: 11,
    font: boldFont,
  });

  y -= 18;

  page.drawText(`Invoice #: ${invoiceNumber}`, {
    x,
    y,
    size: 9,
    font: regularFont,
  });

  y -= 15;

  page.drawText(`Valid Until: ${validUntil.toLocaleDateString()}`, {
    x,
    y,
    size: 9,
    font: regularFont,
  });

  y -= 15;

  layout.y = y;
}

function drawCustomerSection(
  page: PDFPage,
  layout: PdfLayout,
  customerRequest: InvoicePdfData["customerRequest"]
) {
  const { x, boldFont, regularFont } = layout;
  let y = layout.y;

  page.drawText(customerRequest.customerName, {
    x: 310,
    y: y + 18,
    size: 10,
    font: boldFont,
  });

  page.drawText(customerRequest.phone, {
    x: 310,
    y,
    size: 9,
    font: regularFont,
  });

  if (customerRequest.email) {
    y -= 15;
    page.drawText(customerRequest.email, {
      x: 310,
      y,
      size: 9,
      font: regularFont,
    });
  }

  y -= 20;

  page.drawText("SHIPMENT DETAILS", {
    x,
    y,
    size: 11,
    font: boldFont,
  });

  layout.y = y - 18;
}

function drawShipmentSection(
  page: PDFPage,
  layout: PdfLayout,
  customerRequest: InvoicePdfData["customerRequest"]
) {
  const { x, boldFont, regularFont } = layout;
  let y = layout.y;

  const shipmentRows = [
    ["Shipping Method", customerRequest.shippingMethod],
    ["Goods Category", customerRequest.goodsCategory],
    [
      "Weight",
      customerRequest.weightKg
        ? `${customerRequest.weightKg.toString()} kg`
        : "Not provided",
    ],
    [
      "Volume",
      customerRequest.volumeCbm
        ? `${customerRequest.volumeCbm.toString()} CBM`
        : "Not provided",
    ],
    ["Description", customerRequest.goodsDescription],
  ] as const;

  for (const [label, value] of shipmentRows) {
    page.drawText(label, {
      x,
      y,
      size: 9,
      font: boldFont,
    });

    page.drawText(value, {
      x: 190,
      y,
      size: 9,
      font: regularFont,
    });

    y -= 17;
  }

  layout.y = y - 10;
}

function drawPricingSection(
  page: PDFPage,
  layout: PdfLayout,
  invoice: InvoicePdfData["invoice"]
) {
  const { x, boldFont, regularFont } = layout;
  let y = layout.y;

  page.drawText("PRICING", {
    x,
    y,
    size: 11,
    font: boldFont,
  });

  y -= 18;

  const pricingRows = [
    ["Pricing Basis", invoice.pricingBasis],
    ["Rate", `$${invoice.rateUsd.toString()}`],
    ["Handling", `$${invoice.handlingChargeUsd.toString()}`],
    ["Documentation", `$${invoice.documentationChargeUsd.toString()}`],
    ["Special Handling", `$${invoice.specialHandlingChargeUsd.toString()}`],
    ["Discount", `-$${invoice.discountUsd.toString()}`],
  ] as const;

  for (const [label, value] of pricingRows) {
    page.drawText(label, {
      x,
      y,
      size: 9,
      font: regularFont,
    });

    page.drawText(value, {
      x: 430,
      y,
      size: 9,
      font: regularFont,
    });

    y -= 17;
  }

  layout.y = y - 12;
}

function drawTotalsSection(
  page: PDFPage,
  layout: PdfLayout,
  invoice: InvoicePdfData["invoice"]
) {
  const { boldFont, regularFont } = layout;
  const right = page.getWidth() - 48;
  let y = layout.y;

  page.drawLine({
    start: { x: 330, y },
    end: { x: right, y },
    thickness: 1,
    color: rgb(0.8, 0.8, 0.8),
  });

  y -= 20;

  page.drawText("Subtotal USD", {
    x: 330,
    y,
    size: 10,
    font: boldFont,
  });

  page.drawText(`$${invoice.subtotalUsd.toString()}`, {
    x: 430,
    y,
    size: 10,
    font: boldFont,
  });

  y -= 18;

  page.drawText("Exchange Rate", {
    x: 330,
    y,
    size: 9,
    font: regularFont,
  });

  page.drawText(invoice.exchangeRate.toString(), {
    x: 430,
    y,
    size: 9,
    font: regularFont,
  });

  y -= 28;

  page.drawRectangle({
    x: 320,
    y: y - 8,
    width: 225,
    height: 40,
    color: rgb(1, 0.96, 0.9),
    borderColor: rgb(0.95, 0.35, 0.05),
    borderWidth: 1,
  });

  page.drawText("TOTAL PAYABLE", {
    x: 332,
    y: y + 7,
    size: 10,
    font: boldFont,
  });

  page.drawText(`GHS ${invoice.totalGhs.toString()}`, {
    x: 430,
    y: y + 5,
    size: 13,
    font: boldFont,
  });

  layout.y = y - 60;
}

function drawFooter(page: PDFPage, layout: PdfLayout) {
  const { x, boldFont, regularFont } = layout;
  const right = page.getWidth() - 48;
  let y = layout.y;

  page.drawLine({
    start: { x, y },
    end: { x: right, y },
    thickness: 1,
    color: rgb(0.9, 0.9, 0.9),
  });

  y -= 18;

  page.drawText("Thank you for choosing Willis Port.", {
    x,
    y,
    size: 9,
    font: boldFont,
  });

  y -= 14;

  page.drawText(
    "Please contact Willis Port if you have any questions about this invoice.",
    {
      x,
      y,
      size: 8,
      font: regularFont,
    }
  );
}
