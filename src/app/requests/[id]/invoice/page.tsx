import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";

import InvoiceHeader from "./InvoiceHeader";
import CustomerSummary from "./CustomerSummary";
import ShipmentSummary from "./ShipmentSummary";
import PricingSection from "./PricingSection";
import InvoiceActions from "./InvoiceActions";

import styles from "./page.module.css";

type InvoicePageProps = {
  params: Promise<{
    id: string;
  }>;
};

export default async function InvoicePage({
  params,
}: InvoicePageProps) {
  const { id } = await params;

  const customerRequest = await prisma.customerRequest.findUnique({
    where: {
      id,
    },
    include: {
      invoice: true,
    },
  });

  if (!customerRequest || !customerRequest.invoice) {
    notFound();
  }

  const invoice = customerRequest.invoice;

  return (
    <main className={styles.page}>
      <div className={styles.container}>
        <Link
          href={`/requests/${customerRequest.id}`}
          className={styles.backLink}
        >
          ← Back to Request
        </Link>

        <InvoiceHeader
          invoiceNumber={invoice.invoiceNumber}
          status={invoice.status}
        />

        <CustomerSummary
          customerName={customerRequest.customerName}
          phone={customerRequest.phone}
          email={customerRequest.email}
          requestSource={customerRequest.requestSource}
        />

        <ShipmentSummary
          shippingMethod={customerRequest.shippingMethod}
          goodsCategory={customerRequest.goodsCategory}
          weightKg={customerRequest.weightKg?.toString() ?? null}
          volumeCbm={customerRequest.volumeCbm?.toString() ?? null}
          goodsDescription={customerRequest.goodsDescription}
        />

        <PricingSection
          volumeCbm={customerRequest.volumeCbm?.toString() ?? null}
          weightKg={customerRequest.weightKg?.toString() ?? null}
        />

        <section className={styles.section}>
          <h2>Invoice Information</h2>

          <div className={styles.grid}>
            <div>
              <span>Currency</span>
              <strong>{invoice.currency}</strong>
            </div>

            <div>
              <span>Exchange Rate</span>
              <strong>
                {invoice.exchangeRate.toString()}
              </strong>
            </div>

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

            <div>
              <span>Valid Until</span>
              <strong>
                {invoice.validUntil.toLocaleDateString()}
              </strong>
            </div>
          </div>
        </section>

        <InvoiceActions
          customerPhone={customerRequest.phone}
          customerEmail={customerRequest.email}
        />
      </div>
    </main>
  );
}
