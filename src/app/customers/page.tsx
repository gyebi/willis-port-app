
export const dynamic = "force-dynamic";
import Link from "next/link";
import { prisma } from "@/lib/prisma";

import styles from "./page.module.css";

export default async function CustomersPage() {
  const customers = await prisma.customer.findMany({
    orderBy: {
      name: "asc",
    },
    include: {
      _count: {
        select: {
          shipments: true,
        },
      },
    },
  });

  return (
    <main className={styles.page}>
      <div className={styles.container}>
        <Link href="/" className={styles.backLink}>
          ← Back to Dashboard
        </Link>

        <div className={styles.header}>
          <div>
            <p className={styles.eyebrow}>WILLIS PORT</p>
            <h1>Customers</h1>
            <p className={styles.subtitle}>
              Customers and their shipment tracking records.
            </p>
          </div>
        </div>

        {customers.length === 0 ? (
          <section className={styles.emptyState}>
            <h2>No customers yet</h2>

            <p>
              Customers will appear here once they are added to the
              Willis Port system.
            </p>
          </section>
        ) : (
          <section className={styles.customerList}>
            {customers.map((customer) => (
              <Link
                key={customer.id}
                href={`/customers/${customer.id}`}
                className={styles.customerCard}
              >
                <div>
                  <h2>{customer.name}</h2>

                  <p>
                    {customer.phone ?? "No phone number"}
                  </p>
                </div>

                <div className={styles.shipmentCount}>
                  <strong>{customer._count.shipments}</strong>
                  <span>
                    {customer._count.shipments === 1
                      ? "Shipment"
                      : "Shipments"}
                  </span>
                </div>
              </Link>
            ))}
          </section>
        )}
      </div>
    </main>
  );
}
