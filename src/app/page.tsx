import styles from "./page.module.css";
import Link from "next/link"

export default function Home() {
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
          <strong>0</strong>
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
            <p>Customer shipping requests will appear here.</p>
          </div>
        </div>

        <div className={styles.emptyState}>
          <h3>No requests yet</h3>
          <p>
            Create the first customer request to begin processing a shipment.
          </p>

          <Link href="/requests/new" className={styles.emptyButton}>
            Create Request
          </Link>
        </div>
      </section>
    </main>
  );
}
