import { NextResponse } from "next/server";
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

    return NextResponse.json(
      {
        ok: true,
        message: "Customer request received.",
        requestNumber,
      },
      {
        status: 201,
      }
    );
  } catch {
    return NextResponse.json(
      {
        ok: false,
        message: "Unable to process request.",
      },
      {
        status: 400,
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