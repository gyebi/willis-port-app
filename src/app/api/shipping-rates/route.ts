
import { NextResponse } from "next/server";

import { prisma } from "@/lib/prisma";


export async function GET(
  request: Request
) {
  try {
    const { searchParams } =
      new URL(request.url);

    const shippingMode =
      searchParams.get("shippingMode");

    const serviceType =
      searchParams.get("serviceType");

    const goodsCategory =
      searchParams.get("goodsCategory");


    if (
      !shippingMode ||
      !serviceType ||
      !goodsCategory
    ) {
      return NextResponse.json(
        {
          ok: false,
          message:
            "Missing shipping rate parameters.",
        },
        {
          status: 400,
        }
      );
    }


    const rate =
      await prisma.shippingRate.findUnique({
        where: {
          shippingMode_serviceType_goodsCategory:
          {
            shippingMode:
              shippingMode as any,

            serviceType:
              serviceType as any,

            goodsCategory:
              goodsCategory as any,
          },
        },
      });


    if (!rate) {
      return NextResponse.json(
        {
          ok: false,
          message:
            "No shipping rate found.",
        },
        {
          status: 404,
        }
      );
    }


    return NextResponse.json({
      ok: true,

      rateUsd:
        rate.rateUsd.toString(),

      pricingBasis:
        rate.pricingBasis,

      unit:
        rate.unit,
    });

  } catch (error) {

    console.error(
      "Failed to get shipping rate:",
      error
    );

    return NextResponse.json(
      {
        ok: false,
        message:
          "Unable to retrieve shipping rate.",
      },
      {
        status: 500,
      }
    );
  }
}
