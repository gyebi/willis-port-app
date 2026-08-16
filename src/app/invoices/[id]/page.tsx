import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";

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
      lines: {
        include: {
          shipment: true,
          shipmentPricing: true,
        },
      },
    },
  });

  if (!invoice || !invoice.customer) {
    notFound();
  }

  return (
    <main className={styles.page}>
      <div className={styles.container}>
        <Link
          href={`/customers/${invoice.customer.id}`}
          className={styles.backLink}
        >
          ← Back to Customer
        </Link>

        <header className={styles.header}>
          <div>
            <p className={styles.eyebrow}>WILLIS PORT</p>
            <h1>{invoice.invoiceNumber}</h1>
            <p className={styles.subtitle}>
              Customer invoice
            </p>
          </div>

          <span className={styles.status}>
            {invoice.status}
          </span>
        </header>

        <section className={styles.section}>
          <h2>Customer</h2>

          <div className={styles.grid}>
            <div>
              <span>Name</span>
              <strong>{invoice.customer.name}</strong>
            </div>

            <div>
              <span>Phone</span>
              <strong>
                {invoice.customer.phone ?? "Not provided"}
              </strong>
            </div>

            <div>
              <span>Email</span>
              <strong>
                {invoice.customer.email ?? "Not provided"}
              </strong>
            </div>

            <div>
              <span>Valid Until</span>
              <strong>
                {invoice.validUntil.toLocaleDateString()}
              </strong>
            </div>
          </div>
        </section>

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

                      <td>
                        {line.description ?? "Not provided"}
                      </td>

                      <td>
                        {line.pricingBasis ?? "—"}
                      </td>

                      <td>
                        {line.billableQuantity?.toString() ?? "—"}
                      </td>

                      <td>
                        {line.unitRateUsd
                          ? `$${line.unitRateUsd.toString()}`
                          : "—"}
                      </td>

                      <td>
                        ${line.lineTotalUsd.toString()}
                      </td>

                      <td>
                        GHS {line.lineTotalGhs.toString()}
                      </td>
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
            <strong>
              ${invoice.subtotalUsd.toString()}
            </strong>
          </div>

          <div>
            <span>Total GHS</span>
            <strong>
              GHS {invoice.totalGhs.toString()}
            </strong>
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
