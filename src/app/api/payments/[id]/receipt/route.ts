import { NextResponse } from "next/server";

import { prisma } from "@/lib/prisma";
import { generateReceiptPdf } from "@/lib/invoice-pdf-renderer";

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
    const { id: paymentId } = await context.params;

    const payment = await prisma.payment.findUnique({
      where: { id: paymentId },
      include: {
        invoice: {
          include: {
            customer: true,
          },
        },
      },
    });

    if (!payment || !payment.invoice || !payment.invoice.customer) {
      return NextResponse.json(
        {
          ok: false,
          message: "Payment not found.",
        },
        { status: 404 }
      );
    }

    const businessSettings =
      await prisma.businessSettings.findFirst();

    const receiptBytes = await generateReceiptPdf({
      receiptNumber: `RCPT-${payment.id.slice(0, 8).toUpperCase()}`,
      paidAt: (payment.paymentDate ?? payment.paidAt).toLocaleDateString("en-GB"),
      paymentMethod: (payment.paymentMethod ?? payment.method).replaceAll("_", " "),
      paymentReference: payment.reference,
      amountGhs: (payment.amount ?? payment.amountGhs).toString(),
      invoiceNumber: payment.invoice.invoiceNumber,
      customerName: payment.invoice.customer.name,
      business: {
        businessName:
          businessSettings?.businessName ?? "WILLIS PORT",
        tagline: businessSettings?.tagline ?? null,
        phone: businessSettings?.phone ?? null,
        whatsapp: businessSettings?.whatsapp ?? null,
        email: businessSettings?.email ?? null,
        address: businessSettings?.address ?? null,
      },
    });

    return new NextResponse(Buffer.from(receiptBytes), {
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `inline; filename="receipt-${payment.id}.pdf"`,
      },
    });
  } catch (error) {
    console.error("Failed to generate receipt:", error);

    return NextResponse.json(
      {
        ok: false,
        message: "Unable to generate receipt.",
      },
      { status: 500 }
    );
  }
}
