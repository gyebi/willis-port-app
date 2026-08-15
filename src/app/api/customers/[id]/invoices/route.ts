import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

type RouteContext = {
  params: Promise<{
    id: string;
  }>;
};

type CreateInvoiceBody = {
  shipmentPricingIds?: unknown;
};

export async function POST(
  request: Request,
  context: RouteContext
) {
  try {
    const { id: customerId } = await context.params;

    let body: CreateInvoiceBody;

    try {
      body = await request.json();
    } catch {
      return NextResponse.json(
        {
          ok: false,
          message: "Invalid request body.",
        },
        {
          status: 400,
        }
      );
    }

    if (
      !Array.isArray(body.shipmentPricingIds) ||
      body.shipmentPricingIds.length === 0 ||
      !body.shipmentPricingIds.every(
        (id) => typeof id === "string"
      )
    ) {
      return NextResponse.json(
        {
          ok: false,
          message:
            "Select at least one approved shipment pricing record.",
        },
        {
          status: 400,
        }
      );
    }

    const shipmentPricingIds = [
      ...new Set(body.shipmentPricingIds),
    ];

    const customer = await prisma.customer.findUnique({
      where: {
        id: customerId,
      },
      select: {
        id: true,
      },
    });

    if (!customer) {
      return NextResponse.json(
        {
          ok: false,
          message: "Customer not found.",
        },
        {
          status: 404,
        }
      );
    }

    const pricingRecords =
      await prisma.shipmentPricing.findMany({
        where: {
          id: {
            in: shipmentPricingIds,
          },

          status: "APPROVED",

          shipment: {
            customerId,
          },
        },

        include: {
          shipment: true,
        },
      });

    if (
      pricingRecords.length !==
      shipmentPricingIds.length
    ) {
      return NextResponse.json(
        {
          ok: false,
          message:
            "One or more selected shipments are invalid or not approved.",
        },
        {
          status: 409,
        }
      );
    }

    const invoice = await prisma.$transaction(
      async (tx) => {
        let subtotalUsd = 0;
        let totalGhs = 0;

        for (const pricing of pricingRecords) {
          subtotalUsd += Number(
            pricing.customerChargeUsd.toString()
          );

          totalGhs += Number(
            pricing.customerChargeGhs.toString()
          );
        }

        const validUntil = new Date();
        validUntil.setDate(validUntil.getDate() + 7);

        return tx.invoice.create({
          data: {
            invoiceNumber: createInvoiceNumber(),

            customerId,

            currency: "USD",

            exchangeRate: 1,
            subtotalUsd,
            totalGhs,

            validUntil,

            status: "DRAFT",

            lines: {
              create: pricingRecords.map((pricing) => ({
                lineType: "SHIPMENT",

                shipmentId: pricing.shipmentId,
                shipmentPricingId: pricing.id,

                description:
                  pricing.shipment.description ??
                  pricing.shipment.trackingNumber ??
                  pricing.shipment.shipmentNumber,

                pricingBasis:
                  pricing.pricingBasis,

                billableQuantity:
                  pricing.billableQuantity,

                unitRateUsd: pricing.unitRateUsd,

                lineTotalUsd:
                  pricing.customerChargeUsd,

                lineTotalGhs:
                  pricing.customerChargeGhs,
              })),
            },
          },
          include: {
            lines: true,
          },
        });
      }
    );

    return NextResponse.json(
      {
        ok: true,
        message: "Invoice created.",

        invoice: {
          id: invoice.id,
          invoiceNumber: invoice.invoiceNumber,
        },
      },
      {
        status: 201,
      }
    );
  } catch (error) {
    console.error("Failed to create customer invoice:", error);

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

  const date = now
    .toISOString()
    .slice(0, 10)
    .replaceAll("-", "");

  const randomPart = crypto
    .randomUUID()
    .slice(0, 8)
    .toUpperCase();

  return `INV-${date}-${randomPart}`;
}
