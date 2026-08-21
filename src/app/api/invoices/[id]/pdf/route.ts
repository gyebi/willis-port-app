import { NextResponse } from "next/server";

import { prisma } from "@/lib/prisma";
import { readPdfBytes } from "@/lib/invoice-document-files";
import { generateIssuedInvoicePdf } from "@/lib/invoice-pdf-renderer";

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
        documents: {
          where: {
            isIssued: true,
          },
          orderBy: {
            generatedAt: "desc",
          },
          take: 1,
        },
        lines: {
          include: {
            shipment: {
              include: {
                container: true,
              },
            },
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
        { status: 404 }
      );
    }

    if (!invoice.customer) {
      return NextResponse.json(
        { error: "Invoice customer is missing" },
        { status: 422 }
      );
    }

    const invoiceForPdf = {
      ...invoice,
      customer: invoice.customer,
    };

    const latestIssuedDocument = invoice.documents[0] ?? null;

    if (latestIssuedDocument?.storagePath) {
      const storedBytes = await readPdfBytes(
        latestIssuedDocument.storagePath
      );

      if (storedBytes) {
        return new NextResponse(Buffer.from(storedBytes), {
          headers: {
            "Content-Type": "application/pdf",
            "Content-Disposition": `inline; filename="${invoice.invoiceNumber}.pdf"`,
          },
        });
      }
    }

    const businessSettings =
      await prisma.businessSettings.findFirst();

    const pdfBytes = await generateIssuedInvoicePdf(
      invoiceForPdf,
      businessSettings
    );

    return new NextResponse(Buffer.from(pdfBytes), {
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
