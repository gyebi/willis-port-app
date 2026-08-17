import Link from "next/link";
import { notFound } from "next/navigation";

import { prisma } from "@/lib/prisma";

import EditShipmentForm from "./EditShipmentForm";
import styles from "./page.module.css";

export const dynamic = "force-dynamic";

type ShipmentPageProps = {
  params: Promise<{
    id: string;
  }>;
};

export default async function ShipmentPage({
  params,
}: ShipmentPageProps) {
  const { id } = await params;

  const shipment = await prisma.shipment.findUnique({
    where: { id },
    include: {
      customer: true,
      container: true,
    },
  });

  if (!shipment) {
    notFound();
  }

  return (
    <main className={styles.page}>
      <div className={styles.container}>
        <Link
          href={`/customers/${shipment.customerId}`}
          className={styles.backLink}
        >
          ← Back to Customer
        </Link>

        <header className={styles.header}>
          <p className={styles.eyebrow}>
            SHIPMENT
          </p>

          <h1>{shipment.shipmentNumber}</h1>

          <p className={styles.customer}>
            Customer:{" "}
            <strong>{shipment.customer.name}</strong>
          </p>
        </header>

        <section className={styles.card}>
          <div className={styles.cardHeader}>
            <h2>Edit Shipment</h2>

            <p>
              Update shipment details and confirmed
              measurements before pricing.
            </p>
          </div>

          <EditShipmentForm
            shipment={{
              id: shipment.id,
              trackingNumber:
                shipment.trackingNumber ?? "",
              shippingMode:
                shipment.shippingMode,
              goodsType:
                shipment.goodsType ?? "",
              dateReceived:
                shipment.dateReceived
                  ? shipment.dateReceived
                      .toISOString()
                      .slice(0, 10)
                  : "",
              weightKg:
                shipment.weightKg?.toString() ?? "",
              declaredCbm:
                shipment.declaredCbm?.toString() ?? "",
              actualCbm:
                shipment.actualCbm?.toString() ?? "",
              chargeableCbm:
                shipment.chargeableCbm?.toString() ??
                "",
              description:
                shipment.description ?? "",
            }}
          />
        </section>
      </div>
    </main>
  );
}