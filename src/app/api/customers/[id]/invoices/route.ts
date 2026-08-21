import { NextResponse } from "next/server";
import { Prisma } from "@/generated/prisma/client";
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
        const invoiceLines = pricingRecords.flatMap(
          (pricing) => {
            const lines = [];

            const resolvedBillableQuantity =
              pricing.pricingBasis === "CBM"
                ? pricing.billableQuantity ??
                pricing.chargeableCbm
                : pricing.pricingBasis === "KG"
                  ? pricing.billableQuantity ??
                  pricing.chargeableWeightKg
                  : null;

            const baseChargeUsd =
              pricing.pricingBasis === "MANUAL"
                ? pricing.manualChargeUsd ??
                new Prisma.Decimal(0)
                : resolvedBillableQuantity &&
                  pricing.unitRateUsd
                  ? resolvedBillableQuantity.mul(
                    pricing.unitRateUsd
                  )
                  : new Prisma.Decimal(0);

            const baseChargeGhs =
              baseChargeUsd.mul(
                pricing.exchangeRateToGhs
              );

            lines.push({
              lineType: "SHIPMENT" as const,
              shipmentId: pricing.shipmentId,
              shipmentPricingId: pricing.id,

              description:
                pricing.shipment.description ??
                pricing.shipment.trackingNumber ??
                pricing.shipment.shipmentNumber,

              pricingBasis: pricing.pricingBasis,
              billableQuantity:
                resolvedBillableQuantity,
              unitRateUsd: pricing.unitRateUsd,

              lineTotalUsd: baseChargeUsd,
              lineTotalGhs: baseChargeGhs,
            });

            if (pricing.handlingChargeUsd.gt(0)) {
              lines.push({
                lineType: "HANDLING" as const,
                shipmentId: pricing.shipmentId,
                shipmentPricingId: pricing.id,
                description: "Handling Charge",
                pricingBasis: null,
                billableQuantity: null,
                unitRateUsd: null,
                lineTotalUsd: pricing.handlingChargeUsd,
                lineTotalGhs:
                  pricing.handlingChargeUsd.mul(
                    pricing.exchangeRateToGhs
                  ),
              });
            }

            if (
              pricing.documentationChargeUsd.gt(0)
            ) {
              lines.push({
                lineType: "DOCUMENTATION" as const,
                shipmentId: pricing.shipmentId,
                shipmentPricingId: pricing.id,
                description:
                  "Documentation Charge",
                pricingBasis: null,
                billableQuantity: null,
                unitRateUsd: null,
                lineTotalUsd:
                  pricing.documentationChargeUsd,
                lineTotalGhs:
                  pricing.documentationChargeUsd.mul(
                    pricing.exchangeRateToGhs
                  ),
              });
            }

            if (
              pricing.specialHandlingChargeUsd.gt(0)
            ) {
              lines.push({
                lineType:
                  "SPECIAL_HANDLING" as const,
                shipmentId: pricing.shipmentId,
                shipmentPricingId: pricing.id,
                description:
                  "Special Handling Charge",
                pricingBasis: null,
                billableQuantity: null,
                unitRateUsd: null,
                lineTotalUsd:
                  pricing.specialHandlingChargeUsd,
                lineTotalGhs:
                  pricing.specialHandlingChargeUsd.mul(
                    pricing.exchangeRateToGhs
                  ),
              });
            }

            if (pricing.deliveryChargeUsd.gt(0)) {
              lines.push({
                lineType: "DELIVERY" as const,
                shipmentId: pricing.shipmentId,
                shipmentPricingId: pricing.id,
                description: "Delivery Charge",
                pricingBasis: null,
                billableQuantity: null,
                unitRateUsd: null,
                lineTotalUsd: pricing.deliveryChargeUsd,
                lineTotalGhs:
                  pricing.deliveryChargeUsd.mul(
                    pricing.exchangeRateToGhs
                  ),
              });
            }

            if (pricing.otherChargeUsd.gt(0)) {
              lines.push({
                lineType: "OTHER" as const,
                shipmentId: pricing.shipmentId,
                shipmentPricingId: pricing.id,
                description:
                  pricing.otherChargeDescription ??
                  "Other Charge",
                pricingBasis: null,
                billableQuantity: null,
                unitRateUsd: null,
                lineTotalUsd: pricing.otherChargeUsd,
                lineTotalGhs:
                  pricing.otherChargeUsd.mul(
                    pricing.exchangeRateToGhs
                  ),
              });
            }

            return lines;
          }
        );

        let subtotalUsd = 0;
        let totalGhs = 0;

        for (const line of invoiceLines) {
          subtotalUsd += Number(
            line.lineTotalUsd.toString()
          );

          totalGhs += Number(
            line.lineTotalGhs.toString()
          );
        }

        const validUntil = new Date();
        validUntil.setDate(validUntil.getDate() + 7);

        return tx.invoice.create({
          data: {
            invoiceNumber: createInvoiceNumber(),

            customerId,

            currency: "USD",

            exchangeRate:
              pricingRecords[0].exchangeRateToGhs,
            subtotalUsd,
            totalGhs,

            validUntil,

            status: "DRAFT",

            lines: {
              create: invoiceLines,
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
