import { NextResponse } from "next/server";

import { prisma } from "@/lib/prisma";

type ShippingMode = "SEA" | "AIR" | "UNKNOWN";
type ServiceType = "STANDARD" | "EXPRESS";
type GoodsCategory = "NORMAL" | "SPECIAL";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);

    const shippingMode = parseShippingMode(
      searchParams.get("shippingMode")
    );
    const serviceType = parseServiceType(
      searchParams.get("serviceType")
    );
    const goodsCategory = parseGoodsCategory(
      searchParams.get("goodsCategory")
    );

    if (!shippingMode || !serviceType || !goodsCategory) {
      return NextResponse.json(
        {
          ok: false,
          message: "Missing or invalid shipping rate parameters.",
        },
        {
          status: 400,
        }
      );
    }

    const rate = await prisma.shippingRate.findUnique({
      where: {
        shippingMode_serviceType_goodsCategory: {
          shippingMode,
          serviceType,
          goodsCategory,
        },
      },
    });

    if (!rate || !rate.active) {
      return NextResponse.json(
        {
          ok: false,
          message: "No active shipping rate found.",
        },
        {
          status: 404,
        }
      );
    }

    return NextResponse.json({
      ok: true,
      rateUsd: rate.rateUsd.toString(),
      pricingBasis: rate.pricingBasis,
      unit: rate.unit,
    });
  } catch (error) {
    console.error("Failed to get shipping rate:", error);

    return NextResponse.json(
      {
        ok: false,
        message: "Unable to retrieve shipping rate.",
      },
      {
        status: 500,
      }
    );
  }
}

function parseShippingMode(
  value: string | null
): ShippingMode | null {
  if (value === "SEA" || value === "AIR" || value === "UNKNOWN") {
    return value;
  }

  return null;
}

function parseServiceType(
  value: string | null
): ServiceType | null {
  if (value === "STANDARD" || value === "EXPRESS") {
    return value;
  }

  return null;
}

function parseGoodsCategory(
  value: string | null
): GoodsCategory | null {
  if (value === "NORMAL" || value === "SPECIAL") {
    return value;
  }

  return null;
}
