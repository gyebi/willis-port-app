import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

type RouteContext = {
  params: Promise<{
    id: string;
  }>;
};

export async function POST(
  _request: Request,
  context: RouteContext
) {
  try {
    const { id } = await context.params;

    const pricing =
      await prisma.shipmentPricing.findUnique({
        where: {
          id,
        },
      });

    if (!pricing) {
      return NextResponse.json(
        {
          ok: false,
          message: "Pricing record not found.",
        },
        {
          status: 404,
        }
      );
    }

    if (pricing.status !== "DRAFT") {
      return NextResponse.json(
        {
          ok: false,
          message:
            "Only draft pricing can be approved.",
        },
        {
          status: 409,
        }
      );
    }

    const result =
      await prisma.shipmentPricing.updateMany({
        where: {
          id,
          status: "DRAFT",
        },
        data: {
          status: "APPROVED",
          approvedAt: new Date(),
        },
      });

    if (result.count !== 1) {
      return NextResponse.json(
        {
          ok: false,
          message:
            "Pricing changed before approval. Refresh and try again.",
        },
        {
          status: 409,
        }
      );
    }

    return NextResponse.json({
      ok: true,
      message: "Shipment pricing approved.",
    });
  } catch (error) {
    console.error(
      "Failed to approve shipment pricing:",
      error
    );

    return NextResponse.json(
      {
        ok: false,
        message:
          "Unable to approve shipment pricing.",
      },
      {
        status: 500,
      }
    );
  }
}
