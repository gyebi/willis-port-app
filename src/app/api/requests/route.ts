import { NextResponse } from "next/server";
import { Prisma } from "@/generated/prisma/client";

import { prisma } from "@/lib/prisma";
import { requestSchema } from "@/lib/request-schema";

export async function POST(request: Request) {
  try {
    const body: unknown = await request.json();

    const result = requestSchema.safeParse(body);

    if (!result.success) {
      return NextResponse.json(
        {
          ok: false,
          message: "Invalid request data.",
          errors: result.error.flatten().fieldErrors,
        },
        {
          status: 400,
        }
      );
    }

    const requestNumber = createRequestNumber();
    const shipmentNumber = createShipmentNumber();

    const created = await prisma.$transaction(async (tx) => {
      let customerId: string;

      if (result.data.customerId) {
        const existingCustomer = await tx.customer.findUnique({
          where: {
            id: result.data.customerId,
          },
          select: {
            id: true,
          },
        });

        if (!existingCustomer) {
          throw new Error("SELECTED_CUSTOMER_NOT_FOUND");
        }

        customerId = existingCustomer.id;
      } else {
        const customer = await tx.customer.create({
          data: {
            name: result.data.customerName,
            phone: result.data.phone || null,
            email: result.data.email || null,
          },
          select: {
            id: true,
          },
        });

        customerId = customer.id;
      }

      const shipment = await tx.shipment.create({
        data: {
          shipmentNumber,
          customerId,

          shippingMode: result.data.shippingMethod,

          goodsType: result.data.goodsCategory,

          description: result.data.goodsDescription,

          weightKg:
            result.data.weightKg !== undefined
              ? new Prisma.Decimal(result.data.weightKg)
              : null,

          declaredCbm:
            result.data.volumeCbm !== undefined
              ? new Prisma.Decimal(result.data.volumeCbm)
              : null,

          status: "RECEIVED",
        },
      });

      const customerRequest = await tx.customerRequest.create({
        data: {
          requestNumber,

          customerName: result.data.customerName,
          phone: result.data.phone,
          email: result.data.email || null,

          requestSource: result.data.requestSource,
          shippingMethod: result.data.shippingMethod,
          goodsCategory: result.data.goodsCategory,

          weightKg:
            result.data.weightKg !== undefined
              ? new Prisma.Decimal(result.data.weightKg)
              : null,

          volumeCbm:
            result.data.volumeCbm !== undefined
              ? new Prisma.Decimal(result.data.volumeCbm)
              : null,

          goodsDescription: result.data.goodsDescription,

          customerId,
          shipmentId: shipment.id,
        },
      });

      return {
        customerRequest,
        shipment,
        customerId,
      };
    });

    return NextResponse.json(
      {
        ok: true,
        message: "Customer request saved.",
        requestNumber:
          created.customerRequest.requestNumber,
        id: created.customerRequest.id,
        customerId: created.customerId,
        shipmentId: created.shipment.id,
      },
      {
        status: 201,
      }
    );
  } catch (error) {
    if (
      error instanceof Error &&
      error.message === "SELECTED_CUSTOMER_NOT_FOUND"
    ) {
      return NextResponse.json(
        {
          ok: false,
          message:
            "The selected customer could not be found.",
        },
        {
          status: 404,
        }
      );
    }

    console.error(
      "Failed to create customer request:",
      error
    );

    return NextResponse.json(
      {
        ok: false,
        message: "Unable to save request.",
      },
      {
        status: 500,
      }
    );
  }
}

function createRequestNumber() {
  const now = new Date();

  const year = now.getUTCFullYear();
  const month = String(
    now.getUTCMonth() + 1
  ).padStart(2, "0");

  const day = String(
    now.getUTCDate()
  ).padStart(2, "0");

  const randomPart = crypto
    .randomUUID()
    .slice(0, 8)
    .toUpperCase();

  return `WP-${year}${month}${day}-${randomPart}`;
}

function createShipmentNumber() {
  const now = new Date();

  const year = now.getUTCFullYear();
  const month = String(
    now.getUTCMonth() + 1
  ).padStart(2, "0");

  const day = String(
    now.getUTCDate()
  ).padStart(2, "0");

  const randomPart = crypto
    .randomUUID()
    .slice(0, 8)
    .toUpperCase();

  return `SHP-${year}${month}${day}-${randomPart}`;
}