import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";

import NewShipmentForm from "./NewShipmentForm";
import styles from "./page.module.css";

type NewShipmentPageProps = {
  params: Promise<{
    id: string;
  }>;
};

export default async function NewShipmentPage({
  params,
}: NewShipmentPageProps) {
  const { id } = await params;

  const customer = await prisma.customer.findUnique({
    where: {
      id,
    },
    select: {
      id: true,
      name: true,
    },
  });

  if (!customer) {
    notFound();
  }

  return (
    <main className={styles.page}>
      <div className={styles.container}>
        <Link
          href={`/customers/${customer.id}`}
          className={styles.backLink}
        >
          ← Back to Customer
        </Link>

        <header className={styles.header}>
          <p className={styles.eyebrow}>WILLIS PORT</p>

          <h1>New Shipment</h1>

          <p>
            Add a new shipment or tracking record for{" "}
            <strong>{customer.name}</strong>.
          </p>
        </header>

        <NewShipmentForm customerId={customer.id} />
      </div>
    </main>
  );
}