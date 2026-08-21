import { NextResponse } from "next/server";

import { prisma } from "@/lib/prisma";

type RouteContext = {
  params: Promise<{
    id: string;
  }>;
};

type UpdateCustomerBody = {
  name?: unknown;
  phone?: unknown;
  whatsapp?: unknown;
  email?: unknown;
  address?: unknown;
};

export async function PATCH(
  request: Request,
  context: RouteContext
) {
  try {
    const { id } = await context.params;

    let body: UpdateCustomerBody;

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

    const customer = await prisma.customer.findUnique({
      where: { id },
      select: { id: true },
    });

    if (!customer) {
      return NextResponse.json(
        {
          ok: false,
          message: "Customer not found.",
        },
        { status: 404 }
      );
    }

    const name =
      typeof body.name === "string"
        ? body.name.trim()
        : "";

    if (!name) {
      return NextResponse.json(
        {
          ok: false,
          message: "Customer name is required.",
        },
        { status: 400 }
      );
    }

    const updatedCustomer = await prisma.customer.update({
      where: { id },
      data: {
        name,
        phone: parseOptionalText(body.phone),
        whatsapp: parseOptionalText(body.whatsapp),
        email: parseOptionalText(body.email),
        address: parseOptionalText(body.address),
      },
    });

    return NextResponse.json({
      ok: true,
      message: "Customer updated successfully.",
      customer: {
        id: updatedCustomer.id,
        name: updatedCustomer.name,
        phone: updatedCustomer.phone,
        whatsapp: updatedCustomer.whatsapp,
        email: updatedCustomer.email,
        address: updatedCustomer.address,
      },
    });
  } catch (error) {
    console.error("Failed to update customer:", error);

    return NextResponse.json(
      {
        ok: false,
        message: "Unable to update customer.",
      },
      { status: 500 }
    );
  }
}

function parseOptionalText(value: unknown): string | null {
  if (typeof value !== "string") {
    return null;
  }

  const trimmed = value.trim();

  return trimmed ? trimmed : null;
}
