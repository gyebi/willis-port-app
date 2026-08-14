import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

type RouteContext = {
  params: Promise<{
    id: string;
  }>;
};

export async function POST(_request: Request, context: RouteContext) {
  try {
    const { id } = await context.params;

    const customerRequest = await prisma.customerRequest.findUnique({
      where: {
        id,
      },
      include: {
        invoice: true,
      },
    });

    if (!customerRequest) {
      return NextResponse.json(
        {
          ok: false,
          message: "Customer request not found.",
        },
        {
          status: 404,
        }
      );
    }

    if (customerRequest.invoice) {
      return NextResponse.json(
        {
          ok: false,
          message: "An invoice already exists for this request.",
        },
        {
          status: 409,
        }
      );
    }

    const invoiceNumber = createInvoiceNumber();

    const validUntil = new Date();
    validUntil.setDate(validUntil.getDate() + 7);

    const invoice = await prisma.invoice.create({
      data: {
        invoiceNumber,
        customerRequestId: customerRequest.id,
        currency: "USD",
        exchangeRate: 1,
        subtotalUsd: 0,
        totalGhs: 0,
        validUntil,
      },
    });

    await prisma.customerRequest.update({
      where: {
        id: customerRequest.id,
      },
      data: {
        status: "INVOICED",
      },
    });

    return NextResponse.json(
      {
        ok: true,
        message: "Draft invoice created.",
        invoice,
      },
      {
        status: 201,
      }
    );
  } catch (error) {
    console.error("Failed to create invoice:", error);

    return NextResponse.json(
      {
        ok: false,
        message: "Unable to create invoice.",
      },
      {
        status: 500,
      }
    );
  }
}

function createInvoiceNumber() {
  const now = new Date();

  const year = now.getUTCFullYear();
  const month = String(now.getUTCMonth() + 1).padStart(2, "0");
  const day = String(now.getUTCDate()).padStart(2, "0");

  const randomPart = crypto.randomUUID().slice(0, 8).toUpperCase();

  return `INV-${year}${month}${day}-${randomPart}`;
}
