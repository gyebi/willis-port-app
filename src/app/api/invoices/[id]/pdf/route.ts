import { NextResponse } from "next/server";
import { PDFDocument, StandardFonts, rgb } from "pdf-lib";

import { prisma } from "@/lib/prisma";

type RouteContext = {
  params: Promise<{
    id: string;
  }>;
};

export async function GET(
  _request: Request,
  context: RouteContext
) {
  try {
    const { id } = await context.params;

    const invoice = await prisma.invoice.findUnique({
      where: {
        id,
      },
      include: {
        customer: true,
        lines: {
          include: {
            shipment: true,
          },
          orderBy: {
            createdAt: "asc",
          },
        },
      },
    });

    if (!invoice) {
      return NextResponse.json(
        {
          ok: false,
          message: "Invoice not found.",
        },
        {
          status: 404,
        }
      );
    }

    if (!invoice.customer) {
      return NextResponse.json(
        {
          ok: false,
          message: "Invoice customer not found.",
        },
        {
          status: 409,
        }
      );
    }

    const businessSettings =
      await prisma.businessSettings.findFirst();

    const businessName =
      businessSettings?.businessName ?? "WILLIS PORT";

    const pdf = await PDFDocument.create();

    const regularFont = await pdf.embedFont(
      StandardFonts.Helvetica
    );

    const boldFont = await pdf.embedFont(
      StandardFonts.HelveticaBold
    );

    let page = pdf.addPage([595.28, 841.89]);

    const pageWidth = page.getWidth();
    const pageHeight = page.getHeight();

    const margin = 48;

    let y = pageHeight - margin;

    function drawText(
      text: string | null | undefined,
      x: number,
      currentY: number,
      options?: {
        size?: number;
        bold?: boolean;
      }
    ) {
      const safeText = text ?? "";

      page.drawText(safeText, {
        x,
        y: currentY,
        size: options?.size ?? 10,
        font: options?.bold ? boldFont : regularFont,
        color: rgb(0.08, 0.08, 0.08),
      });
    }

    function drawRightText(
      text: string,
      currentY: number,
      options?: {
        size?: number;
        bold?: boolean;
      }
    ) {
      const size = options?.size ?? 10;
      const font = options?.bold
        ? boldFont
        : regularFont;

      const width = font.widthOfTextAtSize(
        text,
        size
      );

      drawText(
        text,
        pageWidth - margin - width,
        currentY,
        options
      );
    }

    function drawLine(currentY: number) {
      page.drawLine({
        start: {
          x: margin,
          y: currentY,
        },
        end: {
          x: pageWidth - margin,
          y: currentY,
        },
        thickness: 0.7,
        color: rgb(0.82, 0.82, 0.82),
      });
    }


    function formatMoney(
      value: string | number,
      decimals = 2
    ) {
      return Number(value).toLocaleString("en-US", {
        minimumFractionDigits: decimals,
        maximumFractionDigits: decimals,
      });
    }

    function ensureSpace(requiredHeight: number) {
      if (y - requiredHeight > margin) {
        return;
      }

      page = pdf.addPage([595.28, 841.89]);
      y = pageHeight - margin;
    }

    // --------------------------------------------------
    // Header
    // --------------------------------------------------

    drawText(businessName, margin, y, {
      size: 22,
      bold: true,
    });

    drawRightText("INVOICE", y, {
      size: 22,
      bold: true,
    });

    y -= 22;

    if (businessSettings?.tagline) {
      drawText(
        businessSettings.tagline,
        margin,
        y,
        {
          size: 9,
        }
      );

      y -= 14;
    }

    const contactLines = [
      businessSettings?.phone
        ? `Phone: ${businessSettings.phone}`
        : null,

      businessSettings?.whatsapp
        ? `WhatsApp: ${businessSettings.whatsapp}`
        : null,

      businessSettings?.email
        ? `Email: ${businessSettings.email}`
        : null,

      businessSettings?.address
        ? `Address: ${businessSettings.address}`
        : null,
    ].filter(
      (value): value is string => Boolean(value)
    );

    for (const line of contactLines) {
      drawText(line, margin, y, {
        size: 8.5,
      });

      y -= 12;
    }

    y -= 4;

    drawLine(y);

    y -= 24;

    // --------------------------------------------------
    // Invoice details
    // --------------------------------------------------

    drawText("Bill To", margin, y, {
      size: 11,
      bold: true,
    });

    drawText(
      `Invoice #: ${invoice.invoiceNumber}`,
      340,
      y,
      {
        size: 10,
        bold: true,
      }
    );

    y -= 18;

    drawText(
      invoice.customer.name,
      margin,
      y,
      {
        size: 11,
        bold: true,
      }
    );

    drawText(
      `Date: ${invoice.createdAt.toLocaleDateString(
        "en-GB"
      )}`,
      340,
      y
    );
    y -= 18;

    drawText(
      `Valid Until: ${invoice.validUntil.toLocaleDateString("en-GB")}`,
      340,
      y
    );

    y -= 18;

    drawText(
      `Status: ${invoice.status}`,
      340,
      y,
      {
        size: 9,
        bold: true,
      }
    );

    y -= 24;

    if (invoice.customer.phone) {
      drawText(
        `Phone: ${invoice.customer.phone}`,
        margin,
        y,
        {
          size: 9,
        }
      );
    }

    y -= 18;

    if (invoice.customer.email) {
      drawText(
        `Email: ${invoice.customer.email}`,
        margin,
        y,
        {
          size: 9,
        }
      );

      y -= 12;
    }

    drawLine(y);
    y -= 22;

    // --------------------------------------------------
    // Shipment summary
    // --------------------------------------------------

    drawText("Shipment Summary", margin, y, {
      size: 11,
      bold: true,
    });

    y -= 18;

    const shipmentSummaryMap = new Map<
      string,
      {
        shipment: NonNullable<
          (typeof invoice.lines)[number]["shipment"]
        >;
        pricingBasis: string | null;
      }
    >();

    for (const line of invoice.lines) {
      if (!line.shipment) {
        continue;
      }

      const existing =
        shipmentSummaryMap.get(line.shipment.id);

      if (!existing) {
        shipmentSummaryMap.set(line.shipment.id, {
          shipment: line.shipment,
          pricingBasis: line.pricingBasis,
        });

        continue;
      }

      // Some charge lines have no pricing basis.
      // Keep the actual pricing basis when we find it.
      if (!existing.pricingBasis && line.pricingBasis) {
        existing.pricingBasis = line.pricingBasis;
      }
    }

    for (const summary of shipmentSummaryMap.values()) {
      ensureSpace(92);

      const shipment = summary.shipment;

      const trackingNumber =
        shipment.trackingNumber ??
        shipment.shipmentNumber;

      drawText(
        `Tracking: ${trackingNumber}`,
        margin,
        y,
        {
          size: 9,
          bold: true,
        }
      );

      y -= 15;

      drawText(
        `Description: ${shipment.description ?? "Not provided"
        }`,
        margin,
        y,
        {
          size: 8.5,
        }
      );

      y -= 15;

      drawText(
        `Shipping Mode: ${shipment.shippingMode}`,
        margin,
        y,
        {
          size: 8.5,
        }
      );

      drawText(
        `Goods Category: ${shipment.goodsCategory}`,
        310,
        y,
        {
          size: 8.5,
        }
      );

      y -= 15;

      drawText(
        `Actual Weight: ${shipment.weightKg
          ? `${shipment.weightKg.toString()} kg`
          : "Not provided"
        }`,
        margin,
        y,
        {
          size: 8.5,
        }
      );

      drawText(
        `Actual CBM: ${shipment.actualCbm?.toString() ??
        "Not provided"
        }`,
        310,
        y,
        {
          size: 8.5,
        }
      );

      y -= 15;

      drawText(
        `Chargeable CBM: ${shipment.chargeableCbm?.toString() ??
        "Not provided"
        }`,
        margin,
        y,
        {
          size: 8.5,
        }
      );

      drawText(
        `Pricing Basis: ${summary.pricingBasis ?? "—"
        }`,
        310,
        y,
        {
          size: 8.5,
        }
      );

      y -= 20;
    }

    drawLine(y);
    y -= 22;

    // --------------------------------------------------
    // Line items
    // --------------------------------------------------

    drawText("Charges", margin, y, {
      size: 11,
      bold: true,
    });

    y -= 16;

    const tableHeaderY = y;
    const columns = [
      { title: "Tracking", x: margin, width: 100 },
      { title: "Description", x: 150, width: 120 },
      { title: "Basis", x: 280, width: 45 },
      { title: "Qty", x: 335, width: 45 },
      { title: "Rate USD", x: 390, width: 70 },
      { title: "Total USD", x: 470, width: 60 },
    ];

    for (const column of columns) {
      drawText(column.title, column.x, tableHeaderY, {
        size: 8,
        bold: true,
      });
    }

    y -= 12;
    drawLine(y);
    y -= 12;

    for (const line of invoice.lines) {
      ensureSpace(28);

      drawText(
        line.shipment
          ? line.shipment.trackingNumber ??
          line.shipment.shipmentNumber
          : "—",
        margin,
        y,
        {
          size: 8.5,
        }
      );

      drawText(
        line.description ?? "Not provided",
        150,
        y,
        {
          size: 8.5,
        }
      );

      drawText(
        line.pricingBasis ?? "—",
        280,
        y,
        {
          size: 8.5,
        }
      );

      drawText(
        line.billableQuantity?.toString() ?? "—",
        335,
        y,
        {
          size: 8.5,
        }
      );

      drawText(
        line.unitRateUsd
          ? `$${line.unitRateUsd.toString()}`
          : "—",
        390,
        y,
        {
          size: 8.5,
        }
      );

      drawText(
        `$${line.lineTotalUsd.toString()}`,
        470,
        y,
        {
          size: 8.5,
        }
      );

      y -= 16;
    }

    y -= 6;
    drawLine(y);
    y -= 22;

    // --------------------------------------------------
    // Totals
    // --------------------------------------------------

    const totalsX = margin;

    drawText(
      "Exchange Rate",
      totalsX,
      y,
      {
        size: 9,
      }
    );

    drawRightText(
      `1 USD = ${formatMoney(
        invoice.exchangeRate.toString(),
        4
      )} GHS`,
      y,
      {
        size: 9,
        bold: true,
      }
    );

    y -= 20;

    drawText("Subtotal USD", totalsX, y, {
      size: 10,
    });

    drawRightText(
      `$${formatMoney(
        invoice.subtotalUsd.toString()
      )}`,
      y,
      {
        size: 10,
        bold: true,
      }
    );

    y -= 24;

    y -= 18;

    page.drawRectangle({
      x: margin,
      y: y - 12,
      width: pageWidth - margin * 2,
      height: 38,
      color: rgb(0.96, 0.55, 0.12),
    });

    drawText(
      "GRAND TOTAL",
      margin + 12,
      y,
      {
        size: 12,
        bold: true,
      }
    );

    const grandTotal =
      `GHS ${formatMoney(
        invoice.totalGhs.toString()
      )}`;

    const grandTotalWidth =
      boldFont.widthOfTextAtSize(
        grandTotal,
        14
      );

    drawText(
      grandTotal,
      pageWidth -
      margin -
      12 -
      grandTotalWidth,
      y - 1,
      {
        size: 14,
        bold: true,
      }
    );

    y -= 50;

    const pdfBytes = await pdf.save();

    return new NextResponse(Buffer.from(pdfBytes), {
      status: 200,
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `inline; filename="invoice-${invoice.invoiceNumber}.pdf"`,
      },
    });
  } catch (error) {
    console.error("Failed to generate invoice PDF:", error);

    return NextResponse.json(
      {
        ok: false,
        message: "Unable to generate invoice PDF.",
      },
      {
        status: 500,
      }
    );
  }
}
