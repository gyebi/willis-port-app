import { NextResponse } from "next/server";
import { Prisma } from "@/generated/prisma/client";
import { prisma } from "@/lib/prisma";

type RouteContext = {
  params: Promise<{
    id: string;
  }>;
};

type SaveInvoiceDraftBody = {
  pricingBasis?: unknown;
  rateUsd?: unknown;
  handlingChargeUsd?: unknown;
  documentationChargeUsd?: unknown;
  specialHandlingChargeUsd?: unknown;
  discountUsd?: unknown;
  exchangeRate?: unknown;
  validUntil?: unknown;
};

type PricingBasisInput = "CBM" | "WEIGHT" | "MANUAL";

export async function POST(_request: Request, context: RouteContext) {
  try {
    const { id } = await context.params;

    const customerRequest = await prisma.customerRequest.findUnique({
      where: { id },
      include: { invoice: true },
    });

    if (!customerRequest) {
      return NextResponse.json(
        { ok: false, message: "Customer request not found." },
        { status: 404 }
      );
    }

    if (customerRequest.invoice) {
      return NextResponse.json(
        { ok: false, message: "An invoice already exists for this request." },
        { status: 409 }
      );
    }

    const invoiceNumber = createInvoiceNumber();
    const validUntil = new Date();
    validUntil.setDate(validUntil.getDate() + 7);

    const invoice = await prisma.invoice.create({
      data: {
        invoiceNumber,
        customerRequestId: customerRequest.id,
        currency: "USD",
        pricingBasis: "CBM",
        rateUsd: new Prisma.Decimal(0),
        handlingChargeUsd: new Prisma.Decimal(0),
        documentationChargeUsd: new Prisma.Decimal(0),
        specialHandlingChargeUsd: new Prisma.Decimal(0),
        discountUsd: new Prisma.Decimal(0),
        exchangeRate: new Prisma.Decimal(1),
        subtotalUsd: new Prisma.Decimal(0),
        totalGhs: new Prisma.Decimal(0),
        validUntil,
      },
    });

    await prisma.customerRequest.update({
      where: { id: customerRequest.id },
      data: { status: "INVOICED" },
    });

    return NextResponse.json(
      {
        ok: true,
        message: "Draft invoice created.",
        invoice,
      },
      { status: 201 }
    );
  } catch (error) {
    console.error("Failed to create invoice:", error);

    return NextResponse.json(
      { ok: false, message: "Unable to create invoice." },
      { status: 500 }
    );
  }
}

export async function PATCH(request: Request, context: RouteContext) {
  try {
    const { id } = await context.params;

    let body: SaveInvoiceDraftBody;

    try {
      body = await request.json();
    } catch {
      return NextResponse.json(
        { ok: false, message: "Invalid JSON request body." },
        { status: 400 }
      );
    }

    const pricingBasis = parsePricingBasis(body.pricingBasis);
    if (!pricingBasis) {
      return NextResponse.json(
        { ok: false, message: "Invalid pricing basis." },
        { status: 400 }
      );
    }

    const rateUsd = parseMoney(body.rateUsd);
    const handlingChargeUsd = parseMoney(body.handlingChargeUsd);
    const documentationChargeUsd = parseMoney(body.documentationChargeUsd);
    const specialHandlingChargeUsd = parseMoney(body.specialHandlingChargeUsd);
    const discountUsd = parseMoney(body.discountUsd);
    const exchangeRate = parseExchangeRate(body.exchangeRate);

    if (
      rateUsd === null ||
      handlingChargeUsd === null ||
      documentationChargeUsd === null ||
      specialHandlingChargeUsd === null ||
      discountUsd === null ||
      exchangeRate === null
    ) {
      return NextResponse.json(
        {
          ok: false,
          message: "One or more pricing values are invalid.",
        },
        { status: 400 }
      );
    }

    const validUntil = parseValidUntil(body.validUntil);
    if (!validUntil) {
      return NextResponse.json(
        {
          ok: false,
          message: "A valid invoice expiry date is required.",
        },
        { status: 400 }
      );
    }

    const customerRequest = await prisma.customerRequest.findUnique({
      where: { id },
      include: { invoice: true },
    });

    if (!customerRequest) {
      return NextResponse.json(
        { ok: false, message: "Customer request not found." },
        { status: 404 }
      );
    }

    if (!customerRequest.invoice) {
      return NextResponse.json(
        { ok: false, message: "Invoice not found for this request." },
        { status: 404 }
      );
    }

    if (customerRequest.invoice.status !== "DRAFT") {
      return NextResponse.json(
        { ok: false, message: "Only draft invoices can be edited." },
        { status: 409 }
      );
    }

    let quantity: Prisma.Decimal;

    if (pricingBasis === "CBM") {
      if (customerRequest.volumeCbm === null) {
        return NextResponse.json(
          {
            ok: false,
            message:
              "This shipment has no CBM value available for CBM pricing.",
          },
          { status: 400 }
        );
      }

      quantity = customerRequest.volumeCbm;
    } else if (pricingBasis === "WEIGHT") {
      if (customerRequest.weightKg === null) {
        return NextResponse.json(
          {
            ok: false,
            message:
              "This shipment has no weight available for weight pricing.",
          },
          { status: 400 }
        );
      }

      quantity = customerRequest.weightKg;
    } else {
      quantity = new Prisma.Decimal(1);
    }

    const shippingChargeUsd = quantity.mul(rateUsd);
    const subtotalBeforeDiscount = shippingChargeUsd
      .add(handlingChargeUsd)
      .add(documentationChargeUsd)
      .add(specialHandlingChargeUsd);

    if (discountUsd.greaterThan(subtotalBeforeDiscount)) {
      return NextResponse.json(
        {
          ok: false,
          message: "Discount cannot be greater than the invoice amount.",
        },
        { status: 400 }
      );
    }

    const subtotalUsd = subtotalBeforeDiscount.sub(discountUsd);
    const totalGhs = subtotalUsd.mul(exchangeRate);

    const updateResult = await prisma.invoice.updateMany({
      where: {
        id: customerRequest.invoice.id,
        status: "DRAFT",
      },
      data: {
        pricingBasis,
        rateUsd,
        handlingChargeUsd,
        documentationChargeUsd,
        specialHandlingChargeUsd,
        discountUsd,
        exchangeRate,
        subtotalUsd,
        totalGhs,
        validUntil,
      },
    });

    if (updateResult.count !== 1) {
      return NextResponse.json(
        {
          ok: false,
          message:
            "The invoice changed before it could be saved. Refresh and try again.",
        },
        { status: 409 }
      );
    }

    return NextResponse.json({
      ok: true,
      message: "Invoice draft saved.",
      invoice: {
        pricingBasis,
        rateUsd: rateUsd.toString(),
        shippingChargeUsd: shippingChargeUsd.toString(),
        handlingChargeUsd: handlingChargeUsd.toString(),
        documentationChargeUsd: documentationChargeUsd.toString(),
        specialHandlingChargeUsd: specialHandlingChargeUsd.toString(),
        discountUsd: discountUsd.toString(),
        exchangeRate: exchangeRate.toString(),
        subtotalUsd: subtotalUsd.toString(),
        totalGhs: totalGhs.toString(),
        validUntil: validUntil.toISOString(),
      },
    });
  } catch (error) {
    console.error("Failed to save invoice draft:", error);

    return NextResponse.json(
      { ok: false, message: "Unable to save invoice draft." },
      { status: 500 }
    );
  }
}

function parsePricingBasis(
  value: unknown
): PricingBasisInput | null {
  if (
    value === "CBM" ||
    value === "WEIGHT" ||
    value === "MANUAL"
  ) {
    return value;
  }

  return null;
}

function parseMoney(value: unknown): Prisma.Decimal | null {
  if (typeof value !== "string" && typeof value !== "number") {
    return null;
  }

  const text = String(value).trim();

  if (!/^\d+(\.\d{1,2})?$/.test(text)) {
    return null;
  }

  const amount = new Prisma.Decimal(text);

  if (amount.lessThan(0) || amount.greaterThan(1_000_000_000)) {
    return null;
  }

  return amount;
}

function parseExchangeRate(
  value: unknown
): Prisma.Decimal | null {
  if (typeof value !== "string" && typeof value !== "number") {
    return null;
  }

  const text = String(value).trim();

  if (!/^\d+(\.\d{1,6})?$/.test(text)) {
    return null;
  }

  const rate = new Prisma.Decimal(text);

  if (rate.lessThanOrEqualTo(0) || rate.greaterThan(1_000_000)) {
    return null;
  }

  return rate;
}

function parseValidUntil(value: unknown): Date | null {
  if (typeof value !== "string") {
    return null;
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return null;
  }

  return date;
}

function createInvoiceNumber() {
  const now = new Date();

  const year = now.getUTCFullYear();
  const month = String(now.getUTCMonth() + 1).padStart(2, "0");
  const day = String(now.getUTCDate()).padStart(2, "0");

  const randomPart = crypto.randomUUID().slice(0, 8).toUpperCase();

  return `INV-${year}${month}${day}-${randomPart}`;
}
