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
	y-=18;

	drawText(
  `Valid Until: ${invoice.validUntil.toLocaleDateString("en-GB")}`,
  340,
  y
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

    drawText(
      `Valid Until: ${invoice.validUntil.toLocaleDateString(
        "en-GB"
      )}`,
      340,
      y + 12,
      {
        size: 9,
      }
    );

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
    // Line items
    // --------------------------------------------------

    drawText("Invoice Lines", margin, y, {
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

    drawText("Subtotal USD", totalsX, y, {
      size: 10,
    });

    drawRightText(
      `$${Number(
        invoice.subtotalUsd.toString()
      ).toFixed(2)}`,
      y,
      {
        size: 10,
        bold: true,
      }
    );

    y -= 24;

    drawText("Total GHS", totalsX, y, {
      size: 12,
      bold: true,
    });

    drawRightText(
      `GHS ${Number(
        invoice.totalGhs.toString()
      ).toFixed(2)}`,
      y,
      {
        size: 12,
        bold: true,
      }
    );

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
