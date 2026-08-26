export const dynamic = "force-dynamic";


import Link from "next/link";
import { redirect } from "next/navigation";
import { Prisma } from "@/generated/prisma/client";

import { prisma } from "@/lib/prisma";
import { getSessionUser } from "@/lib/auth/get-session-user";

import ManagerSignOutButton from "./ManagerSignOutButton";
import styles from "./page.module.css";


const channelLabels = {
  EMAIL: "Email",
  WHATSAPP: "WhatsApp",
  SMS: "SMS",
  MAIL: "Mail",
  PRINT: "Print",
} as const;

export default async function Home() {

  const user = await getSessionUser();

  if (!user) {
    redirect("/sign-in");
  }

  if (user.role === "AGENT") {
    redirect("/agent/entry");
  }

  const [
    customerCount,
    shipmentCount,
    containerCount,
    newRequests,
    receivedShipments,
    awaitingPricing,
    pricingApproved,
    draftInvoices,
    notYetIssuedInvoices,
    sentOrAwaitingPaymentInvoices,
    paidInvoices,
    deliveryChannelGroups,
    issuedInvoiceTotals,
    paymentTotals,
  ] = await Promise.all([
    prisma.customer.count(),
    prisma.shipment.count(),
    prisma.container.count(),
    prisma.customerRequest.count({
      where: {
        status: "NEW",
      },
    }),
    prisma.shipment.count({
      where: {
        status: "RECEIVED",
      },
    }),
    prisma.shipment.count({
      where: {
        pricings: {
          none: {
            status: "APPROVED",
          },
        },
      },
    }),
    prisma.shipment.count({
      where: {
        pricings: {
          some: {
            status: "APPROVED",
          },
        },
      },
    }),
    prisma.invoice.count({
      where: {
        status: "DRAFT",
      },
    }),
    prisma.invoice.count({
      where: {
        documents: {
          none: {
            isIssued: true,
          },
        },
      },
    }),
    prisma.invoice.count({
      where: {
        status: {
          in: ["SENT", "AWAITING_PAYMENT"],
        },
      },
    }),
    prisma.invoice.count({
      where: {
        status: "PAID",
      },
    }),
    prisma.invoiceDelivery.groupBy({
      by: ["channel"],
      _count: {
        _all: true,
      },
    }),
    prisma.invoice.aggregate({
      where: {
        documents: {
          some: {
            isIssued: true,
          },
        },
      },
      _sum: {
        totalGhs: true,
      },
    }),
    prisma.payment.aggregate({
      _sum: {
        amountGhs: true,
      },
    }),
  ]);

  const totalInvoicedGhs =
    issuedInvoiceTotals._sum.totalGhs ?? new Prisma.Decimal(0);
  const paymentsReceivedGhs =
    paymentTotals._sum.amountGhs ?? new Prisma.Decimal(0);
  const outstandingGhs = totalInvoicedGhs.sub(paymentsReceivedGhs);

  const channelCounts = Object.fromEntries(
    Object.entries(channelLabels).map(([channel]) => [channel, 0])
  ) as Record<keyof typeof channelLabels, number>;

  const operations = [
    {
      title: "Customers",
      href: "/customers",
      value: customerCount.toLocaleString(),
      description: "Customer directory and shipment history.",
    },
    {
      title: "Shipments",
      href: "/customers",
      value: shipmentCount.toLocaleString(),
      description: "Open shipment records from customer pages.",
    },
    {
      title: "Pricing",
      href: "/customers",
      value: awaitingPricing.toLocaleString(),
      description: "Review shipments waiting on pricing.",
    },
    {
      title: "Invoices",
      href: "/customers",
      value: sentOrAwaitingPaymentInvoices.toLocaleString(),
      description: "Open customer invoice workspaces.",
    },
    {
      title: "Containers",
      href: "/containers",
      value: containerCount.toLocaleString(),
      description: "Container planning and transit tracking.",
    },
    {
      title: "Payments",
      href: "/payments",
      value: `GHS ${paymentsReceivedGhs.toString()}`,
      description: "Manager payment queue and invoice collections.",
    },
  ] as const;

  for (const group of deliveryChannelGroups) {
    channelCounts[group.channel] = group._count._all;
  }

  return (
    <main className={styles.page}>
      <div className={styles.container}>
        <header className={styles.header}>
          <div>
            <p className={styles.eyebrow}>WILLIS PORT</p>
            <h1>Operations Dashboard</h1>
            <p className={styles.subtitle}>
              Central navigation for customer, shipment, invoice, container,
              and payment operations.
            </p>
          </div>

          <ManagerSignOutButton className={styles.managerSignOutButton} />
        </header>

        <section className={styles.section}>
          <div className={styles.sectionHeader}>
            <div>
              <h2>Operations</h2>
              <p>Jump into the main Manager work areas.</p>
            </div>
          </div>

          <div className={styles.operationsGrid}>
            {operations.map((operation) => (
              <Link
                key={operation.title}
                href={operation.href}
                className={styles.operationCard}
              >
                <p>{operation.title}</p>
                <strong>{operation.value}</strong>
                <span>{operation.description}</span>
              </Link>
            ))}
          </div>
        </section>

        <section className={styles.section}>
          <div className={styles.sectionHeader}>
            <div>
              <h2>Workflow</h2>
              <p>Current counts across the operational pipeline.</p>
            </div>
          </div>

          <div className={styles.stats}>
            <article className={styles.card}>
              <p>New Requests</p>
              <strong>{newRequests}</strong>
            </article>

            <article className={styles.card}>
              <p>Shipments Received</p>
              <strong>{receivedShipments}</strong>
            </article>

            <article className={styles.card}>
              <p>Awaiting Pricing</p>
              <strong>{awaitingPricing}</strong>
            </article>

            <article className={styles.card}>
              <p>Pricing Approved</p>
              <strong>{pricingApproved}</strong>
            </article>

            <article className={styles.card}>
              <p>Draft Invoices</p>
              <strong>{draftInvoices}</strong>
            </article>

            <article className={styles.card}>
              <p>Not Yet Issued</p>
              <strong>{notYetIssuedInvoices}</strong>
            </article>

            <article className={styles.card}>
              <p>Sent / Awaiting Payment</p>
              <strong>{sentOrAwaitingPaymentInvoices}</strong>
            </article>

            <article className={styles.card}>
              <p>Paid Invoices</p>
              <strong>{paidInvoices}</strong>
            </article>
          </div>
        </section>

        <section className={styles.section}>
          <div className={styles.sectionHeader}>
            <div>
              <h2>Financials</h2>
              <p>Issued invoice totals and amounts already collected.</p>
            </div>
          </div>

          <div className={styles.stats}>
            <article className={styles.cardAccent}>
              <p>Total Invoiced GHS</p>
              <strong>GHS {totalInvoicedGhs.toString()}</strong>
            </article>

            <article className={styles.cardAccent}>
              <p>Payments Received GHS</p>
              <strong>GHS {paymentsReceivedGhs.toString()}</strong>
            </article>

            <article className={styles.cardAccent}>
              <p>Outstanding GHS</p>
              <strong>
                GHS {outstandingGhs.lessThan(0) ? "0" : outstandingGhs.toString()}
              </strong>
            </article>
          </div>
        </section>

        <section className={styles.section}>
          <div className={styles.sectionHeader}>
            <div>
              <h2>Delivery Channels</h2>
              <p>Recorded invoice issue attempts by channel.</p>
            </div>
          </div>

          <div className={styles.channelGrid}>
            {(Object.entries(channelLabels) as Array<
              [keyof typeof channelLabels, string]
            >).map(([channel, label]) => (
              <article key={channel} className={styles.channelCard}>
                <p>{label}</p>
                <strong>{channelCounts[channel]}</strong>
              </article>
            ))}
          </div>
        </section>
      </div>
    </main>
  );
}
