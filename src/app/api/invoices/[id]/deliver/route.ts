import { NextResponse } from "next/server";

import { prisma } from "@/lib/prisma";
import {
  buildInvoiceDocumentStoragePath,
  readPdfBytes,
  savePdfBytes,
} from "@/lib/invoice-document-files";
import { generateIssuedInvoicePdf } from "@/lib/invoice-pdf-renderer";

type RouteContext = {
  params: Promise<{
    id: string;
  }>;
};

type DeliverBody = {
  channel?: unknown;
};

type DeliveryChannel =
  | "EMAIL"
  | "WHATSAPP"
  | "SMS"
  | "MAIL"
  | "PRINT";

export async function POST(
  request: Request,
  context: RouteContext
) {
  try {
    const { id: invoiceId } = await context.params;

    let body: DeliverBody;

    try {
      body = await request.json();
    } catch {
      return NextResponse.json(
        {
          ok: false,
          message: "Invalid request body.",
        },
        { status: 400 }
      );
    }

    const channel = parseChannel(body.channel);

    if (!channel) {
      return NextResponse.json(
        {
          ok: false,
          message: "Invalid delivery channel.",
        },
        { status: 400 }
      );
    }

    const invoice = await prisma.invoice.findUnique({
      where: { id: invoiceId },
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
        { error: "Invoice not found" },
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

    const recipientResult = resolveRecipient(channel, invoice.customer);

    if (!recipientResult.ok) {
      return NextResponse.json(
        {
          ok: false,
          message: recipientResult.message,
        },
        { status: 400 }
      );
    }

    const businessSettings = await prisma.businessSettings.findFirst();
    const issuedDocument = invoice.documents[0] ?? null;

    let storagePath = issuedDocument?.storagePath ?? null;
    let documentRecord = issuedDocument;

    if (!documentRecord) {
      const pdfBytes = await generateIssuedInvoicePdf(
        invoiceForPdf,
        businessSettings
      );

      storagePath = buildInvoiceDocumentStoragePath({
        customerId: invoice.customer.id,
        customerName: invoice.customer.name,
        invoiceNumber: invoice.invoiceNumber,
      });

      await savePdfBytes(storagePath, pdfBytes);

      documentRecord = await prisma.invoiceDocument.create({
        data: {
          invoiceId: invoice.id,
          storagePath,
          fileName: `${invoice.invoiceNumber}.pdf`,
          version: 1,
          isIssued: true,
        },
      });
    } else if (storagePath) {
      const existingBytes = await readPdfBytes(storagePath);

      if (!existingBytes) {
        const pdfBytes = await generateIssuedInvoicePdf(
          invoiceForPdf,
          businessSettings
        );
        await savePdfBytes(storagePath, pdfBytes);
      }
    }

    const deliveryStatus =
      channel === "MAIL"
        ? "MAIL_PREPARED"
        : channel === "PRINT"
          ? "PRINT_REQUESTED"
          : "INITIATED";

    const nextInvoiceStatus =
      channel === "MAIL" || channel === "PRINT"
        ? "AWAITING_PAYMENT"
        : "SENT";

    const delivery = await prisma.$transaction(async (tx) => {
      const createdDelivery = await tx.invoiceDelivery.create({
        data: {
          invoiceId: invoice.id,
          invoiceDocumentId: documentRecord!.id,
          channel,
          recipient: recipientResult.recipient,
          status: deliveryStatus,
          sentAt: null,
          notes:
            channel === "PRINT"
              ? "Print requested from invoice workspace."
              : channel === "MAIL"
                ? "Mail prepared from invoice workspace."
                : "Delivery initiated from invoice workspace.",
        },
      });

      if (invoice.status === "DRAFT") {
        await tx.invoice.update({
          where: { id: invoice.id },
          data: {
            status: nextInvoiceStatus,
          },
        });
      } else if (
        invoice.status === "SENT" &&
        nextInvoiceStatus === "AWAITING_PAYMENT"
      ) {
        await tx.invoice.update({
          where: { id: invoice.id },
          data: {
            status: "AWAITING_PAYMENT",
          },
        });
      }

      return createdDelivery;
    });

    return NextResponse.json({
      ok: true,
      message: "Invoice issued.",
      delivery: {
        id: delivery.id,
        channel: delivery.channel,
        recipient: delivery.recipient,
        status: delivery.status,
      },
      invoiceStatus:
        channel === "MAIL" || channel === "PRINT"
          ? "AWAITING_PAYMENT"
          : "SENT",
      documentId: documentRecord!.id,
      documentUrl: `/api/invoices/${invoice.id}/pdf`,
    });
  } catch (error) {
    console.error("Failed to issue invoice:", error);

    return NextResponse.json(
      {
        ok: false,
        message: "Unable to issue invoice.",
      },
      { status: 500 }
    );
  }
}

function parseChannel(value: unknown): DeliveryChannel | null {
  if (
    value === "EMAIL" ||
    value === "WHATSAPP" ||
    value === "SMS" ||
    value === "MAIL" ||
    value === "PRINT"
  ) {
    return value;
  }

  return null;
}

function resolveRecipient(
  channel: DeliveryChannel,
  customer: {
    name: string;
    phone: string | null;
    whatsapp: string | null;
    email: string | null;
    address: string | null;
  }
):
  | { ok: true; recipient: string }
  | { ok: false; message: string } {
  if (channel === "EMAIL") {
    if (!customer.email) {
      return {
        ok: false,
        message: "Customer email is required for email delivery.",
      };
    }

    return { ok: true, recipient: customer.email };
  }

  if (channel === "WHATSAPP") {
    const recipient = customer.whatsapp ?? customer.phone;

    if (!recipient) {
      return {
        ok: false,
        message: "Customer WhatsApp or phone number is required for WhatsApp delivery.",
      };
    }

    return { ok: true, recipient };
  }

  if (channel === "SMS") {
    if (!customer.phone) {
      return {
        ok: false,
        message: "Customer phone number is required for SMS delivery.",
      };
    }

    return { ok: true, recipient: customer.phone };
  }

  if (channel === "MAIL") {
    return {
      ok: true,
      recipient: customer.address ?? customer.name,
    };
  }

  return {
    ok: true,
    recipient: customer.name,
  };
}
