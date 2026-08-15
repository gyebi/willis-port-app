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
  unitRateUsd?: unknown;
  manualChargeUsd?: unknown;
  exchangeRateToGhs?: unknown;
  notes?: unknown;
};

export async function POST(
  request: Request,
  context: RouteContext
) {
  try {
    const { id: shipmentId } =
      await context.params;

    let body: PricingBody;

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

    const pricingBasis =
      parsePricingBasis(body.pricingBasis);

    if (!pricingBasis) {
      return NextResponse.json(
        {
          ok: false,
          message: "Invalid pricing basis.",
        },
        {
          status: 400,
        }
      );
    }

    const exchangeRate =
      parseRequiredDecimal(
        body.exchangeRateToGhs,
        6
      );

    if (!exchangeRate || exchangeRate.lessThanOrEqualTo(0)) {
      return NextResponse.json(
        {
          ok: false,
          message:
            "A valid exchange rate is required.",
        },
        {
          status: 400,
        }
      );
    }

    const shipment =
      await prisma.shipment.findUnique({
        where: {
          id: shipmentId,
        },
      });

    if (!shipment) {
      return NextResponse.json(
        {
          ok: false,
          message: "Shipment not found.",
        },
        {
          status: 404,
        }
      );
    }

    let billableQuantity:
      | Prisma.Decimal
      | null = null;

    let unitRate:
      | Prisma.Decimal
      | null = null;

    let manualCharge:
      | Prisma.Decimal
      | null = null;

    let chargeableWeight:
      | Prisma.Decimal
      | null = null;

    let customerChargeUsd:
      Prisma.Decimal;

    if (pricingBasis === "CBM") {
      if (!shipment.chargeableCbm) {
        return NextResponse.json(
          {
            ok: false,
            message:
              "Chargeable CBM is required for CBM pricing.",
          },
          {
            status: 400,
          }
        );
      }

      unitRate =
        parseRequiredDecimal(
          body.unitRateUsd,
          2
        );

      if (!unitRate) {
        return NextResponse.json(
          {
            ok: false,
            message:
              "A valid rate per CBM is required.",
          },
          {
            status: 400,
          }
        );
      }

      billableQuantity =
        shipment.chargeableCbm;

      customerChargeUsd =
        billableQuantity.mul(unitRate);
    } else if (pricingBasis === "KG") {
      chargeableWeight =
        parseRequiredDecimal(
          body.chargeableWeightKg,
          3
        );

      unitRate =
        parseRequiredDecimal(
          body.unitRateUsd,
          2
        );

      if (
        !chargeableWeight ||
        !unitRate
      ) {
        return NextResponse.json(
          {
            ok: false,
            message:
              "Chargeable weight and KG rate are required.",
          },
          {
            status: 400,
          }
        );
      }

      billableQuantity =
        chargeableWeight;

      customerChargeUsd =
        billableQuantity.mul(unitRate);
    } else {
      manualCharge =
        parseRequiredDecimal(
          body.manualChargeUsd,
          2
        );

      if (!manualCharge) {
        return NextResponse.json(
          {
            ok: false,
            message:
              "A manual charge is required.",
          },
          {
            status: 400,
          }
        );
      }

      customerChargeUsd =
        manualCharge;
    }

    const customerChargeGhs =
      customerChargeUsd.mul(exchangeRate);

    const pricing =
      await prisma.shipmentPricing.create({
        data: {
          shipmentId,

          pricingBasis,
          status: "DRAFT",

          actualCbm:
            shipment.actualCbm,

          chargeableCbm:
            shipment.chargeableCbm,

          weightKg:
            shipment.weightKg,

          chargeableWeightKg:
            chargeableWeight,

          billableQuantity,

          unitRateUsd:
            unitRate,

          manualChargeUsd:
            manualCharge,

          exchangeRateToGhs:
            exchangeRate,

          customerChargeUsd,
          customerChargeGhs,

          notes:
            parseOptionalText(body.notes),
        },
      });

    return NextResponse.json(
      {
        ok: true,
        message:
          "Shipment pricing saved.",
        pricing: {
          id: pricing.id,
          customerChargeUsd:
            pricing.customerChargeUsd.toString(),
          customerChargeGhs:
            pricing.customerChargeGhs.toString(),
        },
      },
      {
        status: 201,
      }
    );
  } catch (error) {
    console.error(
      "Failed to save shipment pricing:",
      error
    );

    return NextResponse.json(
      {
        ok: false,
        message:
          "Unable to save shipment pricing.",
      },
      {
        status: 500,
      }
    );
  }
}

function parsePricingBasis(
  value: unknown
): "CBM" | "KG" | "MANUAL" | null {
  if (
    value === "CBM" ||
    value === "KG" ||
    value === "MANUAL"
  ) {
    return value;
  }

  return null;
}

function parseRequiredDecimal(
  value: unknown,
  decimals: number
): Prisma.Decimal | null {
  if (
    typeof value !== "string" &&
    typeof value !== "number"
  ) {
    return null;
  }

  const text =
    String(value).trim();

  const pattern =
    new RegExp(
      `^\\d+(\\.\\d{1,${decimals}})?$`
    );

  if (!pattern.test(text)) {
    return null;
  }

  const amount =
    new Prisma.Decimal(text);

  if (
    amount.lessThanOrEqualTo(0) ||
    amount.greaterThan(
      1_000_000_000
    )
  ) {
    return null;
  }

  return amount;
}

function parseOptionalText(
  value: unknown
) {
  if (typeof value !== "string") {
    return null;
  }

  const text = value.trim();

  return text || null;
}