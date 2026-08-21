import { NextResponse } from "next/server";
import { Prisma } from "@/generated/prisma/client";
import { prisma } from "@/lib/prisma";

type RouteContext = {
  params: Promise<{
    id: string;
  }>;
};

type UpdateShipmentBody = {
  trackingNumber?: unknown;
  containerId?: unknown;
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

export async function PATCH(
  request: Request,
  context: RouteContext
) {
  try {
    const { id } = await context.params;

    let body: UpdateShipmentBody;

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

    const shippingMode =
      parseShippingMode(body.shippingMode);

    if (!shippingMode) {
      return NextResponse.json(
        {
          ok: false,
          message: "Invalid shipping mode.",
        },
        { status: 400 }
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
        { status: 400 }
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
        { status: 400 }
      );
    }

    const weightKg =
      parseOptionalDecimal(body.weightKg);

    const chargeableWeightKg =
      parseOptionalDecimal(body.chargeableWeightKg);

    const declaredCbm =
      parseOptionalDecimal(body.declaredCbm);

    const actualCbm =
      parseOptionalDecimal(body.actualCbm);

    const chargeableCbm =
      parseOptionalDecimal(body.chargeableCbm);

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
            "Weight, chargeable weight, or CBM contains an invalid value.",
        },
        { status: 400 }
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
        { status: 400 }
      );
    }

    const containerId = parseOptionalText(body.containerId);

    if (containerId) {
      const container = await prisma.container.findUnique({
        where: { id: containerId },
        select: { id: true },
      });

      if (!container) {
        return NextResponse.json(
          {
            ok: false,
            message: "Container not found.",
          },
          { status: 404 }
        );
      }
    }

    const shipment = await prisma.shipment.findUnique({
      where: { id },
      select: { id: true },
    });

    if (!shipment) {
      return NextResponse.json(
        {
          ok: false,
          message: "Shipment not found.",
        },
        { status: 404 }
      );
    }

    const updatedShipment =
      await prisma.shipment.update({
        where: { id },
        data: {
          trackingNumber:
            parseOptionalText(body.trackingNumber),
          containerId,

          description:
            parseOptionalText(body.description),

          goodsType:
            parseOptionalText(body.goodsType),

          shippingMode,
          serviceType,
          goodsCategory,

          weightKg,
          chargeableWeightKg,
          declaredCbm,
          actualCbm,
          chargeableCbm,
          dateReceived,
        },
      });

    return NextResponse.json({
      ok: true,
      message: "Shipment updated successfully.",
      shipment: {
        id: updatedShipment.id,
        shipmentNumber:
          updatedShipment.shipmentNumber,
        trackingNumber:
          updatedShipment.trackingNumber,
        shippingMode:
          updatedShipment.shippingMode,
        goodsType:
          updatedShipment.goodsType,
        weightKg:
          updatedShipment.weightKg?.toString() ?? null,
        chargeableWeightKg:
          updatedShipment.chargeableWeightKg?.toString() ?? null,
        declaredCbm:
          updatedShipment.declaredCbm?.toString() ?? null,
        actualCbm:
          updatedShipment.actualCbm?.toString() ?? null,
        chargeableCbm:
          updatedShipment.chargeableCbm?.toString() ??
          null,
        dateReceived:
          updatedShipment.dateReceived?.toISOString() ??
          null,
      },
    });
  } catch (error) {
    console.error(
      "Failed to update shipment:",
      error
    );

    return NextResponse.json(
      {
        ok: false,
        message: "Unable to update shipment.",
      },
      { status: 500 }
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

function parseOptionalDecimal(
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

  const number = new Prisma.Decimal(text);

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
