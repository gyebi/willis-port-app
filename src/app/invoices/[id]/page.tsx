import Link from "next/link";
import Image from "next/image";
import { notFound } from "next/navigation";
import { Prisma } from "@/generated/prisma/client";

import { prisma } from "@/lib/prisma";

import InvoiceWorkspace from "./InvoiceWorkspace";
import styles from "./page.module.css";

export const dynamic = "force-dynamic";

type InvoicePageProps = {
  params: Promise<{
    id: string;
  }>;
};

export default async function InvoicePage({
  params,
}: InvoicePageProps) {
  const { id } = await params;

  const invoice = await prisma.invoice.findUnique({
    where: {
      id,
    },
    include: {
      customer: true,
      documents: {
        where: {
          isIssued: true,
        },
        orderBy: {
          generatedAt: "desc",
        },
        take: 1,
      },
      deliveries: {
        orderBy: {
          createdAt: "desc",
        },
      },
      payments: {
        orderBy: {
          paidAt: "desc",
        },
      },
      lines: {
        include: {
          shipment: {
            include: {
              container: true,
            },
          },
          shipmentPricing: true,
        },
        orderBy: {
          createdAt: "asc",
        },
      },
    },
  });

  if (!invoice || !invoice.customer) {
    notFound();
  }

  const containerOptions = await prisma.container.findMany({
    orderBy: {
      containerNumber: "asc",
    },
    select: {
      id: true,
      containerNumber: true,
      status: true,
    },
  });

  const shipmentMap = new Map<
    string,
    {
      id: string;
      shipmentNumber: string;
      trackingNumber: string | null;
      description: string | null;
      containerId: string | null;
      containerNumber: string | null;
      shippingMode: "SEA" | "AIR" | "UNKNOWN";
      serviceType: "STANDARD" | "EXPRESS";
      goodsCategory: "NORMAL" | "SPECIAL";
      goodsType: string | null;
      weightKg: string | null;
      chargeableWeightKg: string | null;
      declaredCbm: string | null;
      actualCbm: string | null;
      chargeableCbm: string | null;
      dateReceived: string | null;
    }
  >();

  for (const line of invoice.lines) {
    if (!line.shipment || shipmentMap.has(line.shipment.id)) {
      continue;
    }

    shipmentMap.set(line.shipment.id, {
      id: line.shipment.id,
      shipmentNumber: line.shipment.shipmentNumber,
      trackingNumber: line.shipment.trackingNumber,
      description: line.shipment.description,
      containerId: line.shipment.containerId,
      containerNumber:
        line.shipment.container?.containerNumber ?? null,
      shippingMode: line.shipment.shippingMode,
      serviceType: line.shipment.serviceType,
      goodsCategory: line.shipment.goodsCategory,
      goodsType: line.shipment.goodsType,
      weightKg:
        line.shipment.weightKg?.toString() ?? null,
      chargeableWeightKg:
        line.shipment.chargeableWeightKg?.toString() ?? null,
      declaredCbm:
        line.shipment.declaredCbm?.toString() ?? null,
      actualCbm:
        line.shipment.actualCbm?.toString() ?? null,
      chargeableCbm:
        line.shipment.chargeableCbm?.toString() ?? null,
      dateReceived: line.shipment.dateReceived
        ? line.shipment.dateReceived.toISOString().slice(0, 10)
        : null,
    });
  }

  const shipments = [...shipmentMap.values()];
  const latestDocument = invoice.documents[0] ?? null;
  const paidTotal = invoice.payments.reduce(
    (total, payment) => total.add(payment.amountGhs),
    new Prisma.Decimal(0)
  );
  const balance = new Prisma.Decimal(invoice.totalGhs).sub(paidTotal);

  return (
    <main className={styles.page}>
      <div className={styles.container}>
        <Link href="/" className={styles.backLink}>
          ← Back to Dashboard
        </Link>

        <Link
          href={`/customers/${invoice.customer.id}`}
          className={styles.backLink}
        >
          ← Back to Customer
        </Link>

        <header className={styles.header}>
          <div className={styles.brand}>
            <Image
              src="/willis-log.png"
              alt="Willis Port"
              width={84}
              height={84}
              className={styles.logo}
              priority
            />

            <div>
              <p className={styles.eyebrow}>WILLIS PORT</p>
              <h1>{invoice.invoiceNumber}</h1>
              <p className={styles.subtitle}>
                Customer invoice
              </p>
            </div>
          </div>

          <span className={styles.status}>
            {invoice.status.replaceAll("_", " ")}
          </span>
        </header>

        <section className={styles.section}>
          <div className={styles.grid}>
            <div>
              <span>Issued PDF</span>
              <strong>
                {latestDocument ? "Available" : "Not issued yet"}
              </strong>
            </div>

            <div>
              <span>Payments Received</span>
              <strong>GHS {paidTotal.toString()}</strong>
            </div>

            <div>
              <span>Outstanding Balance</span>
              <strong>
                GHS {balance.lessThan(0) ? "0" : balance.toString()}
              </strong>
            </div>

            <div>
              <span>Valid Until</span>
              <strong>
                {invoice.validUntil.toISOString().slice(0, 10)}
              </strong>
            </div>
          </div>
        </section>

        <InvoiceWorkspace
          invoiceId={invoice.id}
          invoiceNumber={invoice.invoiceNumber}
          status={invoice.status}
          validUntil={invoice.validUntil.toISOString().slice(0, 10)}
          balanceGhs={balance.lessThan(0) ? "0" : balance.toString()}
          customer={{
            id: invoice.customer.id,
            name: invoice.customer.name,
            phone: invoice.customer.phone,
            whatsapp: invoice.customer.whatsapp,
            email: invoice.customer.email,
            address: invoice.customer.address,
          }}
          invoiceDocument={
            latestDocument
              ? {
                  id: latestDocument.id,
                  storagePath: latestDocument.storagePath,
                  generatedAt:
                    latestDocument.generatedAt.toISOString(),
                }
              : null
          }
          deliveries={invoice.deliveries.map((delivery) => ({
            id: delivery.id,
            channel: delivery.channel,
            status: delivery.status,
            recipient: delivery.recipient,
            createdAt: delivery.createdAt.toISOString(),
            sentAt: delivery.sentAt
              ? delivery.sentAt.toISOString()
              : null,
            notes: delivery.notes,
          }))}
          payments={invoice.payments.map((payment) => ({
            id: payment.id,
            amountGhs: payment.amountGhs.toString(),
            method: payment.method,
            reference: payment.reference,
            notes: payment.notes,
            paidAt: payment.paidAt.toISOString(),
          }))}
          shipments={shipments}
          containerOptions={containerOptions}
        />

        <section className={styles.section}>
          <h2>Invoice Lines</h2>

          <div className={styles.tableWrapper}>
            <table className={styles.table}>
              <thead>
                <tr>
                  <th>Tracking</th>
                  <th>Description</th>
                  <th>Basis</th>
                  <th>Quantity</th>
                  <th>Rate USD</th>
                  <th>Total USD</th>
                  <th>Total GHS</th>
                </tr>
              </thead>

              <tbody>
                {invoice.lines.map((line) => {
                  const tracking = line.shipment
                    ? line.shipment.trackingNumber ??
                      line.shipment.shipmentNumber
                    : "—";

                  return (
                    <tr key={line.id}>
                      <td>{tracking}</td>

                      <td>{line.description ?? "Not provided"}</td>

                      <td>{line.pricingBasis ?? "—"}</td>

                      <td>
                        {line.billableQuantity?.toString() ?? "—"}
                      </td>

                      <td>
                        {line.unitRateUsd
                          ? `$${line.unitRateUsd.toString()}`
                          : "—"}
                      </td>

                      <td>${line.lineTotalUsd.toString()}</td>

                      <td>GHS {line.lineTotalGhs.toString()}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </section>

        <section className={styles.totals}>
          <div>
            <span>Subtotal USD</span>
            <strong>${invoice.subtotalUsd.toString()}</strong>
          </div>

          <div>
            <span>Total GHS</span>
            <strong>GHS {invoice.totalGhs.toString()}</strong>
          </div>
        </section>

        <section className={styles.actions}>
          <Link
            href={`/api/invoices/${invoice.id}/pdf`}
            target="_blank"
            className={styles.primaryButton}
          >
            Preview PDF
          </Link>
        </section>
      </div>
    </main>
  );
}
