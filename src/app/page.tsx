
export const dynamic = "force-dynamic";
import Link from "next/link";
import { prisma } from "@/lib/prisma";
import styles from "./page.module.css";


export default async function Home() {
  const startOfToday = new Date();
  startOfToday.setHours(0, 0, 0, 0);

 const now = new Date();

const startOfMonth = new Date(
  now.getFullYear(),
  now.getMonth(),
  1
);

const startOfNextMonth = new Date(
  now.getFullYear(),
  now.getMonth() + 1,
  1
);

const requestsThisMonth =
  await prisma.customerRequest.count({
    where: {
      createdAt: {
        gte: startOfMonth,
        lt: startOfNextMonth,
      },
    },
  });

const invoicesIssuedThisMonth =
  await prisma.invoice.count({
    where: {
      createdAt: {
        gte: startOfMonth,
        lt: startOfNextMonth,
      },
      status: {
        in: [
          "SENT",
          "AWAITING_PAYMENT",
          "PAID",
        ],
      },
    },
  });

const awaitingPayment =
  await prisma.invoice.count({
    where: {
      status: "AWAITING_PAYMENT",
    },
  });

const paidInvoiceCount =
  await prisma.invoice.count({
    where: {
      status: "PAID",
    },
  });

  const recentRequests = await prisma.customerRequest.findMany({
    orderBy: {
      createdAt: "desc",
    },
    take: 10,
  });

  return (
    <main className={styles.page}>
      <header className={styles.header}>
        <div>
          <p className={styles.eyebrow}>WILLIS PORT</p>
          <h1>Operations Dashboard</h1>
          <p className={styles.subtitle}>
            Customer requests, invoices, payments and shipping operations.
          </p>
        </div>

        <Link
          href="/requests/new"
          className={styles.newRequestButton}
        >
          + New Request
        </Link>
      </header>

      <section className={styles.stats}>
        <article className={styles.card}>
          <p>Requests This Month</p>
          <strong>{requestsThisMonth}</strong>
        </article>

        <article className={styles.card}>
          <p>Invoices Issued This Month</p>
          <strong>{invoicesIssuedThisMonth}</strong>
        </article>

        <article className={styles.card}>
          <p>Awaiting Payment</p>
          <strong>{awaitingPayment}</strong>
        </article>

        <article className={styles.card}>
          <p>Paid Invoices</p>
          <strong>{paidInvoiceCount}</strong>
        </article>
      </section>

      <section className={styles.requests}>
        <div className={styles.sectionHeader}>
          <div>
            <h2>Recent Requests</h2>
            <p>Latest customer shipping requests.</p>
          </div>
        </div>

        {recentRequests.length === 0 ? (
          <div className={styles.emptyState}>
            <h3>No requests yet</h3>

            <p>
              Create the first customer request to begin processing a shipment.
            </p>

            <Link
              href="/requests/new"
              className={styles.emptyButton}
            >
              Create Request
            </Link>
          </div>
        ) : (
          <div className={styles.requestList}>

            {recentRequests.map((request) => (
              <Link
                key={request.id}
                href={`/requests/${request.id}`}
                className={styles.requestRow}
              >
                <div>
                  <strong>{request.customerName}</strong>
                  <p>{request.requestNumber}</p>
                </div>

                <div>
                  <span>{request.shippingMethod}</span>
                  <p>{request.goodsCategory}</p>
                </div>

                <div>
                  <span className={styles.status}>
                    {request.status.replaceAll("_", " ")}
                  </span>
                </div>

                <div>
                  <span>
                    {request.createdAt.toLocaleDateString()}
                  </span>
                </div>
              </Link>
            ))}
          </div>
        )}
      </section>
    </main>
  );
}
