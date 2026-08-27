
import { NextResponse } from "next/server";
import { randomUUID } from "crypto";

import { prisma } from "@/lib/prisma";
import { getSessionUser } from "@/lib/auth/get-session-user";
import { resolveShipmentSchedule } from "@/lib/shipment-scheduling";

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

type AgentEntryBody = {
  existingCustomerId?: unknown;
  customerId?: unknown;
  customerName?: unknown;
  client?: unknown;
  phone?: unknown;
  whatsapp?: unknown;
  email?: unknown;
  address?: unknown;
  trackingNumber?: unknown;
  description?: unknown;
  shippingMode?: unknown;
  weight?: unknown;
  cbm?: unknown;
  dateReceived?: unknown;
  goodsType?: unknown;
  actualCbm?: unknown;
  chargeableCbm?: unknown;
  container?: unknown;
  status?: unknown;
};

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

    let body: AgentEntryBody;

    try {
      body = (await request.json()) as AgentEntryBody;
    } catch {
      return NextResponse.json(
        { error: "Invalid request body." },
        { status: 400 }
      );
    }

    const existingCustomerId =
      cleanString(body.existingCustomerId) ??
      cleanString(body.customerId);
    const customerName =
      cleanString(body.customerName) ??
      cleanString(body.client);
    const phone = cleanString(body.phone);
    const whatsapp = cleanString(body.whatsapp);
    const email = cleanString(body.email);
    const address = cleanString(body.address);
    const trackingNumber = cleanString(body.trackingNumber);
    const description = cleanString(body.description);
    const goodsType = cleanString(body.goodsType);
    const containerNumber = cleanString(body.container);

    const shippingMode = cleanString(body.shippingMode);
    const status = cleanString(body.status);

    if (!customerName) {
      return NextResponse.json(
        { error: "Customer name is required." },
        { status: 400 }
      );
    }

    if (!phone) {
      return NextResponse.json(
        { error: "Customer phone is required." },
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

    const dateReceived = parseDate(body.dateReceived);
    const schedule = resolveShipmentSchedule({ dateReceived });

    if (!schedule.dateReceived) {
      return NextResponse.json(
        { error: "A valid received date is required." },
        { status: 400 }
      );
    }

    const result = await prisma.$transaction(async (tx) => {
      let customer: {
        id: string;
        name: string;
      };

      if (existingCustomerId) {
        const existingCustomer = await tx.customer.findUnique({
          where: {
            id: existingCustomerId,
          },
          select: {
            id: true,
          },
        });

        if (!existingCustomer) {
          throw new Error("CUSTOMER_NOT_FOUND");
        }

        customer = await tx.customer.update({
          where: {
            id: existingCustomerId,
          },
          data: {
            name: customerName,
            phone,
            whatsapp,
            email,
            address,
          },
        });
      } else {
        customer = await tx.customer.create({
          data: {
            name: customerName,
            phone,
            whatsapp,
            email,
            address,
          },
        });
      }

      let containerId: string | null = null;

      if (containerNumber) {
        const existingContainer = await tx.container.findFirst({
          where: {
            containerNumber,
            shippingMode:
              shippingMode as "SEA" | "AIR" | "UNKNOWN",
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
              estimatedLoadingDate:
                schedule.effectiveEstimatedLoadingDate,
              eta: schedule.eta,
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
          calculatedEstimatedLoadingDate:
            schedule.calculatedEstimatedLoadingDate,
          estimatedLoadingDate:
            schedule.effectiveEstimatedLoadingDate,
          estimatedLoadingDateOverride: null,
          estimatedLoadingOverrideReason: null,
          estimatedLoadingOverrideAt: null,
          estimatedLoadingOverrideByUserId: null,
          eta: schedule.eta,
          sortingCompleteDate:
            schedule.sortingCompleteDate,
          collectionDate: schedule.collectionDate,
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
        customerId: result.customer.id,
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
      error.message === "CUSTOMER_NOT_FOUND"
    ) {
      return NextResponse.json(
        { error: "Selected customer was not found." },
        { status: 404 }
      );
    }

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
