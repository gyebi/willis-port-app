import { NextResponse } from "next/server";
import { Prisma } from "@/generated/prisma/client";

import { prisma } from "@/lib/prisma";
import { getSessionUser } from "@/lib/auth/get-session-user";

type RouteContext = {
  params: Promise<{
    id: string;
  }>;
};

type PaymentBody = {
  amountGhs?: unknown;
  method?: unknown;
  reference?: unknown;
  notes?: unknown;
};

type PaymentMethod =
  | "CASH"
  | "BANK_TRANSFER"
  | "MOBILE_MONEY"
  | "CARD"
  | "OTHER";

export async function POST(
  request: Request,
  context: RouteContext
) {
  try {
    const { id: invoiceId } = await context.params;

    let body: PaymentBody;

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

    const amountResult = parseAmount(body.amountGhs);

    if (!amountResult.ok) {
      return NextResponse.json(
        {
          ok: false,
          message: amountResult.message,
        },
        { status: 400 }
      );
    }

    const method = parseMethod(body.method);

    if (!method) {
      return NextResponse.json(
        {
          ok: false,
          message: "Invalid payment method.",
        },
        { status: 400 }
      );
    }

    const invoice = await prisma.invoice.findUnique({
      where: { id: invoiceId },
      select: {
        id: true,
        status: true,
        totalGhs: true,
      },
    });

    if (!invoice) {
      return NextResponse.json(
        {
          ok: false,
          message: "Invoice not found.",
        },
        { status: 404 }
      );
    }

    if (invoice.status === "DRAFT") {
      return NextResponse.json(
        {
          ok: false,
          message: "Issue the invoice before recording payment.",
        },
        { status: 409 }
      );
    }

    if (invoice.status === "CANCELLED") {
      return NextResponse.json(
        {
          ok: false,
          message: "Cancelled invoices cannot receive payment.",
        },
        { status: 409 }
      );
    }

    const sessionUser = await getSessionUser();
    const paidAt = new Date();

    const payment = await prisma.payment.create({
      data: {
        invoiceId,
        amountGhs: amountResult.value,
        method,
        amount: amountResult.value,
        paymentDate: paidAt,
        paymentMethod: method,
        reference:
          typeof body.reference === "string"
            ? body.reference.trim() || null
            : null,
        notes:
          typeof body.notes === "string"
            ? body.notes.trim() || null
            : null,
        paidAt,
        receivedByUserId: sessionUser?.id ?? null,
      },
    });

    const aggregate = await prisma.payment.aggregate({
      where: { invoiceId },
      _sum: {
        amountGhs: true,
      },
    });

    const paidTotal = aggregate._sum.amountGhs ?? new Prisma.Decimal(0);
    const balance = new Prisma.Decimal(invoice.totalGhs).sub(
      paidTotal
    );

    let nextStatus: "SENT" | "AWAITING_PAYMENT" | "PAID" = "AWAITING_PAYMENT";

    if (balance.lessThanOrEqualTo(0)) {
      nextStatus = "PAID";
    } else if (invoice.status === "SENT") {
      nextStatus = "AWAITING_PAYMENT";
    }

    await prisma.invoice.update({
      where: { id: invoiceId },
      data: {
        status: nextStatus,
      },
    });

    return NextResponse.json({
      ok: true,
      message: nextStatus === "PAID" ? "Invoice paid." : "Payment recorded.",
      payment: {
        id: payment.id,
        amountGhs: payment.amountGhs.toString(),
        amount: payment.amount?.toString() ?? payment.amountGhs.toString(),
        method: payment.method,
        paymentMethod:
          payment.paymentMethod ?? payment.method,
        paymentDate:
          (payment.paymentDate ?? payment.paidAt).toISOString(),
        receivedByUserId: payment.receivedByUserId,
      },
      balanceGhs: balance.lessThan(0) ? "0" : balance.toString(),
      invoiceStatus: nextStatus,
      receiptUrl: `/api/payments/${payment.id}/receipt`,
    });
  } catch (error) {
    console.error("Failed to record payment:", error);

    return NextResponse.json(
      {
        ok: false,
        message: "Unable to record payment.",
      },
      { status: 500 }
    );
  }
}

function parseAmount(value: unknown):
  | { ok: true; value: Prisma.Decimal }
  | { ok: false; message: string } {
  if (value === null || value === undefined || value === "") {
    return {
      ok: false,
      message: "Payment amount is required.",
    };
  }

  const text = String(value).trim();

  if (!/^\d+(\.\d{1,2})?$/.test(text)) {
    return {
      ok: false,
      message: "Invalid payment amount.",
    };
  }

  const amount = new Prisma.Decimal(text);

  if (amount.lessThanOrEqualTo(0)) {
    return {
      ok: false,
      message: "Payment amount must be greater than zero.",
    };
  }

  return {
    ok: true,
    value: amount,
  };
}

function parseMethod(value: unknown): PaymentMethod | null {
  if (
    value === "CASH" ||
    value === "BANK_TRANSFER" ||
    value === "MOBILE_MONEY" ||
    value === "CARD" ||
    value === "OTHER"
  ) {
    return value;
  }

  return null;
}
