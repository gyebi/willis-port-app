import { NextResponse } from "next/server";
import { Prisma } from "@/generated/prisma/client";
import { prisma } from "@/lib/prisma";

type RouteContext = {
  params: Promise<{
    id: string;
  }>;
};

type ShipmentBody = {
  trackingNumber?: unknown;
  description?: unknown;
  shippingMode?: unknown;
  serviceType?: unknown;
  goodsCategory?: unknown;
  goodsType?: unknown;
  weightKg?: unknown;
  chargeableWeightKg?: unknown;
  declaredCbm?: unknown;
  actualCbm?: unknown;
  chargeableCbm?: unknown;
  dateReceived?: unknown;
};

export async function POST(
  request: Request,
  context: RouteContext
) {
  try {
    const { id: customerId } =
      await context.params;

    let body: ShipmentBody;

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

    const customer =
      await prisma.customer.findUnique({
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

    const shippingMode =
      parseShippingMode(body.shippingMode);

    if (!shippingMode) {
      return NextResponse.json(
        {
          ok: false,
          message: "Invalid shipping mode.",
        },
        {
          status: 400,
        }
      );
    }

    const serviceType =
      parseServiceType(body.serviceType);

    if (!serviceType) {
      return NextResponse.json(
        {
          ok: false,
          message: "Invalid service type.",
        },
        {
          status: 400,
        }
      );
    }

    const goodsCategory =
      parseGoodsCategory(body.goodsCategory);

    if (!goodsCategory) {
      return NextResponse.json(
        {
          ok: false,
          message: "Invalid goods category.",
        },
        {
          status: 400,
        }
      );
    }

    const weightKg =
      parsePositiveDecimal(body.weightKg);

    const chargeableWeightKg =
      parsePositiveDecimal(
        body.chargeableWeightKg
      );

    const declaredCbm =
      parsePositiveDecimal(body.declaredCbm);

    const actualCbm =
      parsePositiveDecimal(body.actualCbm);

    const chargeableCbm =
      parsePositiveDecimal(body.chargeableCbm);

    if (
      weightKg === undefined ||
      chargeableWeightKg === undefined ||
      declaredCbm === undefined ||
      actualCbm === undefined ||
      chargeableCbm === undefined
    ) {
      return NextResponse.json(
        {
          ok: false,
          message:
            "Weight or CBM contains an invalid value.",
        },
        {
          status: 400,
        }
      );
    }

    const dateReceived =
      parseOptionalDate(body.dateReceived);

    if (dateReceived === undefined) {
      return NextResponse.json(
        {
          ok: false,
          message: "Invalid received date.",
        },
        {
          status: 400,
        }
      );
    }

    const shipmentNumber =
      createShipmentNumber();

    const shipment =
      await prisma.shipment.create({
        data: {
          shipmentNumber,
          customerId,

          trackingNumber:
            parseOptionalText(
              body.trackingNumber
            ),

          description:
            parseOptionalText(
              body.description
            ),

          goodsType:
            parseOptionalText(
              body.goodsType
            ),

          shippingMode,
          serviceType,
          goodsCategory,

          weightKg,
          chargeableWeightKg,
          declaredCbm,
          actualCbm,
          chargeableCbm,

          dateReceived,

          status: "RECEIVED",
        },
      });

    return NextResponse.json(
      {
        ok: true,
        message: "Shipment created.",
        shipment: {
          id: shipment.id,
          shipmentNumber:
            shipment.shipmentNumber,
        },
      },
      {
        status: 201,
      }
    );
  } catch (error) {
    console.error(
      "Failed to create shipment:",
      error
    );

    return NextResponse.json(
      {
        ok: false,
        message: "Unable to create shipment.",
      },
      {
        status: 500,
      }
    );
  }
}

function parseShippingMode(
  value: unknown
): "SEA" | "AIR" | "UNKNOWN" | null {
  if (
    value === "SEA" ||
    value === "AIR" ||
    value === "UNKNOWN"
  ) {
    return value;
  }

  return null;
}

function parseServiceType(
  value: unknown
): "STANDARD" | "EXPRESS" | null {
  if (value === "STANDARD" || value === "EXPRESS") {
    return value;
  }

  return null;
}

function parseGoodsCategory(
  value: unknown
): "NORMAL" | "SPECIAL" | null {
  if (value === "NORMAL" || value === "SPECIAL") {
    return value;
  }

  return null;
}

function parseOptionalText(
  value: unknown
): string | null {
  if (
    value === null ||
    value === undefined
  ) {
    return null;
  }

  if (typeof value !== "string") {
    return null;
  }

  const text = value.trim();

  return text || null;
}

function parsePositiveDecimal(
  value: unknown
): Prisma.Decimal | null | undefined {
  if (
    value === null ||
    value === undefined ||
    value === ""
  ) {
    return null;
  }

  if (
    typeof value !== "string" &&
    typeof value !== "number"
  ) {
    return undefined;
  }

  const text = String(value).trim();

  if (!/^\d+(\.\d{1,4})?$/.test(text)) {
    return undefined;
  }

  const number =
    new Prisma.Decimal(text);

  if (
    number.lessThan(0) ||
    number.greaterThan(1_000_000)
  ) {
    return undefined;
  }

  return number;
}

function parseOptionalDate(
  value: unknown
): Date | null | undefined {
  if (
    value === null ||
    value === undefined ||
    value === ""
  ) {
    return null;
  }

  if (typeof value !== "string") {
    return undefined;
  }

  const date = new Date(
    `${value}T00:00:00.000Z`
  );

  if (Number.isNaN(date.getTime())) {
    return undefined;
  }

  return date;
}

function createShipmentNumber() {
  const now = new Date();

  const date =
    now
      .toISOString()
      .slice(0, 10)
      .replaceAll("-", "");

  const random =
    crypto
      .randomUUID()
      .slice(0, 6)
      .toUpperCase();

  return `SHP-${date}-${random}`;
}
