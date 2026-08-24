
import { NextResponse } from "next/server";
import { randomUUID } from "crypto";

import { prisma } from "@/lib/prisma";
import { getSessionUser } from "@/lib/auth/get-session-user";

const ALLOWED_SHIPPING_MODES = ["SEA", "AIR", "UNKNOWN"] as const;

const ALLOWED_STATUSES = [
  "RECEIVED",
  "ORIGIN",
  "LOADING_SCHEDULED",
  "IN_TRANSIT",
  "CUSTOMS_CLEARANCE",
  "WAREHOUSE",
  "DELIVERED",
  "CANCELLED",
] as const;

function cleanString(value: unknown): string | null {
  if (typeof value !== "string") {
    return null;
  }

  const cleaned = value.trim();

  return cleaned.length > 0 ? cleaned : null;
}

function decimalString(value: unknown): string | null {
  if (value === null || value === undefined || value === "") {
    return null;
  }

  const number = Number(value);

  if (!Number.isFinite(number)) {
    return null;
  }

  return number.toString();
}

function positiveDecimalString(value: unknown): string | null {
  const parsed = decimalString(value);

  if (parsed === null) {
    return null;
  }

  if (Number(parsed) < 0) {
    return null;
  }

  return parsed;
}

function parseDate(value: unknown): Date | null {
  if (typeof value !== "string" || !value) {
    return null;
  }

  const date = new Date(`${value}T00:00:00`);

  if (Number.isNaN(date.getTime())) {
    return null;
  }

  return date;
}

function createShipmentNumber() {
  return `WP-SHP-${Date.now()}-${randomUUID()
    .slice(0, 6)
    .toUpperCase()}`;
}

export async function POST(request: Request) {
  try {
    const user = await getSessionUser();

    if (!user) {
      return NextResponse.json(
        { error: "Authentication required." },
        { status: 401 }
      );
    }

    if (user.role !== "AGENT" && user.role !== "MANAGER") {
      return NextResponse.json(
        { error: "You are not authorized to create shipment entries." },
        { status: 403 }
      );
    }

    const body = await request.json();

    const client = cleanString(body.client);
    const trackingNumber = cleanString(body.trackingNumber);
    const description = cleanString(body.description);
    const goodsType = cleanString(body.goodsType);
    const containerNumber = cleanString(body.container);

    const shippingMode = cleanString(body.shippingMode);
    const status = cleanString(body.status);

    if (!client) {
      return NextResponse.json(
        { error: "Client is required." },
        { status: 400 }
      );
    }

    if (
      !shippingMode ||
      !ALLOWED_SHIPPING_MODES.includes(
        shippingMode as (typeof ALLOWED_SHIPPING_MODES)[number]
      )
    ) {
      return NextResponse.json(
        { error: "A valid shipping mode is required." },
        { status: 400 }
      );
    }

    if (
      !status ||
      !ALLOWED_STATUSES.includes(
        status as (typeof ALLOWED_STATUSES)[number]
      )
    ) {
      return NextResponse.json(
        { error: "A valid shipment status is required." },
        { status: 400 }
      );
    }

    const weightKg = positiveDecimalString(body.weight);
    const declaredCbm = positiveDecimalString(body.cbm);
    const actualCbm = positiveDecimalString(body.actualCbm);
    const chargeableCbm = positiveDecimalString(body.chargeableCbm);

    const shippingCostGhs = positiveDecimalString(body.shippingCost);
    const willisPortChargesGhs = positiveDecimalString(
      body.willisPortCharges
    );
    const profitGhs = decimalString(body.profit);

    const dateReceived = parseDate(body.dateReceived);
    const estimatedLoadingDate = parseDate(body.estimatedLoadingDate);
    const eta = parseDate(body.eta);

    const result = await prisma.$transaction(async (tx) => {
      let customer = await tx.customer.findFirst({
        where: {
          name: {
            equals: client,
            mode: "insensitive",
          },
        },
        orderBy: {
          createdAt: "asc",
        },
      });

      if (!customer) {
        customer = await tx.customer.create({
          data: {
            name: client,
          },
        });
      }

      let containerId: string | null = null;

      if (containerNumber) {
        const existingContainer = await tx.container.findUnique({
          where: {
            containerNumber,
          },
        });

        if (
          existingContainer &&
          existingContainer.shippingMode !== shippingMode
        ) {
          throw new Error("CONTAINER_MODE_MISMATCH");
        }

        const container =
          existingContainer ??
          (await tx.container.create({
            data: {
              containerNumber,
              shippingMode:
                shippingMode as "SEA" | "AIR" | "UNKNOWN",
              estimatedLoadingDate,
              eta,
            },
          }));

        containerId = container.id;
      }

      const shipment = await tx.shipment.create({
        data: {
          shipmentNumber: createShipmentNumber(),
          customerId: customer.id,
          trackingNumber,
          description,
          shippingMode:
            shippingMode as "SEA" | "AIR" | "UNKNOWN",
          goodsType,
          weightKg,
          declaredCbm,
          actualCbm,
          chargeableCbm,
          dateReceived,
          estimatedLoadingDate,
          eta,
          status:
            status as
              | "RECEIVED"
              | "ORIGIN"
              | "LOADING_SCHEDULED"
              | "IN_TRANSIT"
              | "CUSTOMS_CLEARANCE"
              | "WAREHOUSE"
              | "DELIVERED"
              | "CANCELLED",
          containerId,

          shippingCostGhs,
          willisPortChargesGhs,
          profitGhs,

          enteredByUserId: user.id,
        },
      });

      return {
        customer,
        shipment,
      };
    });

    return NextResponse.json(
      {
        success: true,
        shipment: {
          id: result.shipment.id,
          shipmentNumber: result.shipment.shipmentNumber,
          customerName: result.customer.name,
        },
      },
      { status: 201 }
    );
  } catch (error) {
    if (
      error instanceof Error &&
      error.message === "CONTAINER_MODE_MISMATCH"
    ) {
      return NextResponse.json(
        {
          error:
            "The selected container already exists with a different shipping mode.",
        },
        { status: 409 }
      );
    }

    console.error("Agent entry save failed:", error);

    return NextResponse.json(
      { error: "Unable to save the shipment entry." },
      { status: 500 }
    );
  }
}

