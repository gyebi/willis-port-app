import { NextResponse } from "next/server";
import { Prisma } from "@/generated/prisma/client";

import { prisma } from "@/lib/prisma";

type RouteContext = {
  params: Promise<{
    id: string;
  }>;
};

type PricingBody = {
  pricingBasis?: unknown;
  chargeableWeightKg?: unknown;
  manualChargeUsd?: unknown;
  handlingChargeUsd?: unknown;
  documentationChargeUsd?: unknown;
  specialHandlingChargeUsd?: unknown;
  deliveryChargeUsd?: unknown;
  otherChargeDescription?: unknown;
  otherChargeUsd?: unknown;
  exchangeRateToGhs?: unknown;
  notes?: unknown;
};

export async function POST(
  request: Request,
  context: RouteContext
) {
  try {
    const { id: shipmentId } = await context.params;

    let body: PricingBody;

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

    const requestedPricingBasis = parsePricingBasis(body.pricingBasis);

    if (!requestedPricingBasis) {
      return NextResponse.json(
        {
          ok: false,
          message: "Invalid pricing basis.",
        },
        { status: 400 }
      );
    }

    const exchangeRate = parseRequiredDecimal(body.exchangeRateToGhs, 6);

    if (!exchangeRate || exchangeRate.lessThanOrEqualTo(0)) {
      return NextResponse.json(
        {
          ok: false,
          message: "A valid exchange rate is required.",
        },
        { status: 400 }
      );
    }

    const shipment = await prisma.shipment.findUnique({
      where: { id: shipmentId },
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


    const handlingResult =
      parseOptionalDecimal(body.handlingChargeUsd);

    if (!handlingResult.ok) {
      return NextResponse.json(
        {
          ok: false,
          message: "Invalid handling charge.",
        },
        { status: 400 }
      );
    }

    const handlingChargeUsd = handlingResult.value;

    const documentationResult =
      parseOptionalDecimal(body.documentationChargeUsd);

    if (!documentationResult.ok) {
      return NextResponse.json(
        {
          ok: false,
          message: "Invalid documentation charge.",
        },
        { status: 400 }
      );
    }

    const documentationChargeUsd = documentationResult.value;

    const specialHandlingResult =
      parseOptionalDecimal(body.specialHandlingChargeUsd);

    if (!specialHandlingResult.ok) {
      return NextResponse.json(
        {
          ok: false,
          message: "Invalid special handling charge.",
        },
        { status: 400 }
      );
    }

    const specialHandlingChargeUsd = specialHandlingResult.value;

    const deliveryResult =
      parseOptionalDecimal(body.deliveryChargeUsd);

    if (!deliveryResult.ok) {
      return NextResponse.json(
        {
          ok: false,
          message: "Invalid delivery charge.",
        },
        { status: 400 }
      );
    }

    const deliveryChargeUsd = deliveryResult.value;

    const otherResult =
      parseOptionalDecimal(body.otherChargeUsd);

    if (!otherResult.ok) {
      return NextResponse.json(
        {
          ok: false,
          message: "Invalid other charge.",
        },
        { status: 400 }
      );
    }

    const otherChargeUsd = otherResult.value;

    const otherChargeDescription =
      typeof body.otherChargeDescription === "string"
        ? body.otherChargeDescription.trim() || null
        : null;

    const shippingRate = await prisma.shippingRate.findUnique({
      where: {
        shippingMode_serviceType_goodsCategory: {
          shippingMode: shipment.shippingMode,
          serviceType: shipment.serviceType,
          goodsCategory: shipment.goodsCategory,
        },
      },
    });

    let pricingBasis: "CBM" | "KG" | "MANUAL";

    if (requestedPricingBasis === "MANUAL") {
      pricingBasis = "MANUAL";
    } else {
      if (!shippingRate || !shippingRate.active) {
        return NextResponse.json(
          {
            ok: false,
            message:
              "No active shipping rate exists for this shipment.",
          },
          { status: 400 }
        );
      }

      pricingBasis = shippingRate.pricingBasis;
    }

    const approvedPricing = await prisma.shipmentPricing.findFirst({
      where: {
        shipmentId,
        status: "APPROVED",
      },
      select: {
        id: true,
      },
    });

    if (approvedPricing) {
      return NextResponse.json(
        {
          ok: false,
          message: "This shipment already has approved pricing.",
        },
        { status: 409 }
      );
    }

    let billableQuantity: Prisma.Decimal | null = null;
    let unitRate: Prisma.Decimal | null = null;
    let manualCharge: Prisma.Decimal | null = null;
    let chargeableWeight: Prisma.Decimal | null = null;
    let baseChargeUsd: Prisma.Decimal;

    if (pricingBasis === "CBM") {
      if (!shipment.chargeableCbm) {
        return NextResponse.json(
          {
            ok: false,
            message: "Chargeable CBM is required for CBM pricing.",
          },
          { status: 400 }
        );
      }

      unitRate = shippingRate?.rateUsd ?? null;

      if (!unitRate) {
        return NextResponse.json(
          {
            ok: false,
            message: "A valid rate per CBM is required.",
          },
          { status: 400 }
        );
      }

      billableQuantity = shipment.chargeableCbm;
      baseChargeUsd = billableQuantity.mul(unitRate);
    } else if (pricingBasis === "KG") {
      chargeableWeight =
        shipment.chargeableWeightKg ?? null;

      unitRate =
        shippingRate?.rateUsd ?? null;

      if (!chargeableWeight) {
        return NextResponse.json(
          {
            ok: false,
            message:
              "Chargeable weight is required for KG pricing.",
          },
          { status: 400 }
        );
      }

      if (!unitRate) {
        return NextResponse.json(
          {
            ok: false,
            message:
              "A valid KG shipping rate is required.",
          },
          { status: 400 }
        );
      }

      billableQuantity = chargeableWeight;

      baseChargeUsd = billableQuantity.mul(unitRate);
    } else {
      manualCharge = parseRequiredDecimal(body.manualChargeUsd, 2);

      if (!manualCharge) {
        return NextResponse.json(
          {
            ok: false,
            message: "A manual charge is required.",
          },
          { status: 400 }
        );
      }

      baseChargeUsd = manualCharge;
    }

    const extraChargesUsd = handlingChargeUsd
      .add(documentationChargeUsd)
      .add(specialHandlingChargeUsd)
      .add(deliveryChargeUsd)
      .add(otherChargeUsd);

    const customerChargeUsd = baseChargeUsd.add(extraChargesUsd);
    const customerChargeGhs = customerChargeUsd.mul(exchangeRate);

    await prisma.shipmentPricing.updateMany({
      where: {
        shipmentId,
        status: "DRAFT",
      },
      data: {
        status: "SUPERSEDED",
      },
    });

    const pricing = await prisma.shipmentPricing.create({
      data: {
        shipmentId,
        pricingBasis,
        status: "DRAFT",
        actualCbm: shipment.actualCbm,
        chargeableCbm: shipment.chargeableCbm,
        weightKg: shipment.weightKg,
        chargeableWeightKg: chargeableWeight,
        billableQuantity,
        unitRateUsd: unitRate,
        manualChargeUsd: manualCharge,

        freightChargeUsd: new Prisma.Decimal(0),
        handlingChargeUsd,
        documentationChargeUsd,
        specialHandlingChargeUsd,
        deliveryChargeUsd,
        otherChargeDescription,
        otherChargeUsd,

        exchangeRateToGhs: exchangeRate,
        customerChargeUsd,
        customerChargeGhs,
        notes: parseOptionalText(body.notes),
      },
    });

    return NextResponse.json(
      {
        ok: true,
        message: "Shipment pricing saved.",
        pricing: {
          id: pricing.id,
          customerChargeUsd: pricing.customerChargeUsd.toString(),
          customerChargeGhs: pricing.customerChargeGhs.toString(),
        },
      },
      { status: 201 }
    );
  } catch (error) {
    console.error("Failed to save shipment pricing:", error);

    return NextResponse.json(
      {
        ok: false,
        message: "Unable to save shipment pricing.",
      },
      { status: 500 }
    );
  }
}

function parsePricingBasis(
  value: unknown
): "CBM" | "KG" | "MANUAL" | null {
  if (value === "CBM" || value === "KG" || value === "MANUAL") {
    return value;
  }

  return null;
}

function parseRequiredDecimal(
  value: unknown,
  decimals: number
): Prisma.Decimal | null {
  if (typeof value !== "string" && typeof value !== "number") {
    return null;
  }

  const text = String(value).trim();
  const pattern = new RegExp(`^\\d+(\\.\\d{1,${decimals}})?$`);

  if (!pattern.test(text)) {
    return null;
  }

  const amount = new Prisma.Decimal(text);

  if (amount.lessThanOrEqualTo(0) || amount.greaterThan(1_000_000_000)) {
    return null;
  }

  return amount;
}

function parseOptionalText(value: unknown) {
  if (typeof value !== "string") {
    return null;
  }

  const text = value.trim();
  return text || null;
}

function parseOptionalDecimal(
  value: unknown,
  decimals = 2
):
  | { ok: true; value: Prisma.Decimal }
  | { ok: false } {
  if (
    value === undefined ||
    value === null ||
    value === ""
  ) {
    return {
      ok: true,
      value: new Prisma.Decimal(0),
    };
  }

  if (
    typeof value !== "string" &&
    typeof value !== "number"
  ) {
    return { ok: false };
  }

  const text = String(value).trim();
  const pattern = new RegExp(
    `^\\d+(\\.\\d{1,${decimals}})?$`
  );

  if (!pattern.test(text)) {
    return { ok: false };
  }

  const amount = new Prisma.Decimal(text);

  if (
    amount.lessThan(0) ||
    amount.greaterThan(1_000_000_000)
  ) {
    return { ok: false };
  }

  return {
    ok: true,
    value: amount,
  };
}
