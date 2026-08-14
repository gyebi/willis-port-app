import { NextResponse } from "next/server";
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

    const customerRequest = await prisma.customerRequest.create({
      data: {
        requestNumber,
        customerName: result.data.customerName,
        phone: result.data.phone,
        email: result.data.email || null,
        requestSource: result.data.requestSource,
        shippingMethod: result.data.shippingMethod,
        goodsCategory: result.data.goodsCategory,
        weightKg: result.data.weightKg,
        volumeCbm: result.data.volumeCbm,
        goodsDescription: result.data.goodsDescription,
      },
    });

    return NextResponse.json(
      {
        ok: true,
        message: "Customer request saved.",
        requestNumber: customerRequest.requestNumber,
        id: customerRequest.id,
      },
      {
        status: 201,
      }
    );
  } catch (error) {
    console.error("Failed to create customer request:", error);

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
  const month = String(now.getUTCMonth() + 1).padStart(2, "0");
  const day = String(now.getUTCDate()).padStart(2, "0");

  const randomPart = crypto.randomUUID().slice(0, 8).toUpperCase();

  return `WP-${year}${month}${day}-${randomPart}`;
}