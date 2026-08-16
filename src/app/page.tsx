
export const dynamic = "force-dynamic";
import Link from "next/link";
import { prisma } from "@/lib/prisma";
import styles from "./page.module.css";


export default async function Home() {
  const startOfToday = new Date();
  startOfToday.setHours(0, 0, 0, 0);

  const requestsToday = await prisma.customerRequest.count({
    where: {
      createdAt: {
        gte: startOfToday,
      },
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
          <p>Requests Today</p>
          <strong>{requestsToday}</strong>
        </article>

        <article className={styles.card}>
          <p>Invoices Sent</p>
          <strong>0</strong>
        </article>

        <article className={styles.card}>
          <p>Awaiting Payment</p>
          <strong>0</strong>
        </article>

        <article className={styles.card}>
          <p>Paid</p>
          <strong>0</strong>
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
