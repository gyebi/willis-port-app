import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";

import styles from "./page.module.css";

type ContainerPageProps = {
  params: Promise<{
    id: string;
  }>;
};

export default async function ContainerPage({
  params,
}: ContainerPageProps) {
  const { id } = await params;

  const container = await prisma.container.findUnique({
    where: {
      id,
    },
    include: {
      shipments: {
        orderBy: [
          {
            dateReceived: "desc",
          },
          {
            createdAt: "desc",
          },
        ],
        include: {
          customer: true,
        },
      },
    },
  });

  if (!container) {
    notFound();
  }

  const totalActualCbm = container.shipments.reduce(
    (total, shipment) =>
      total + Number(shipment.actualCbm?.toString() ?? 0),
    0
  );

  const totalChargeableCbm = container.shipments.reduce(
    (total, shipment) =>
      total + Number(shipment.chargeableCbm?.toString() ?? 0),
    0
  );

  return (
    <main className={styles.page}>
      <div className={styles.container}>
        <Link
          href="/containers"
          className={styles.backLink}
        >
          ← Back to Containers
        </Link>

        <header className={styles.header}>
          <div>
            <p className={styles.eyebrow}>WILLIS PORT</p>

            <h1>{container.containerNumber}</h1>

            <p className={styles.subtitle}>
              Container shipment and transit details.
            </p>
          </div>

          <div className={styles.shipmentTotal}>
            <strong>{container.shipments.length}</strong>

            <span>
              {container.shipments.length === 1
                ? "Shipment"
                : "Shipments"}
            </span>
          </div>
        </header>

        <section className={styles.section}>
          <h2>Container Information</h2>

          <div className={styles.infoGrid}>
            <div>
              <span>Shipping Mode</span>
              <strong>{container.shippingMode}</strong>
            </div>

            <div>
              <span>Status</span>
              <strong>
                {formatStatus(container.status)}
              </strong>
            </div>

            <div>
              <span>Estimated Loading Date</span>
              <strong>
                {container.estimatedLoadingDate
                  ? container.estimatedLoadingDate.toLocaleDateString()
                  : "Not set"}
              </strong>
            </div>

            <div>
              <span>Departure Date</span>
              <strong>
                {container.departureDate
                  ? container.departureDate.toLocaleDateString()
                  : "Not set"}
              </strong>
            </div>

            <div>
              <span>ETA</span>
              <strong>
                {container.eta
                  ? container.eta.toLocaleDateString()
                  : "Not set"}
              </strong>
            </div>

            <div>
              <span>Actual Arrival</span>
              <strong>
                {container.actualArrivalDate
                  ? container.actualArrivalDate.toLocaleDateString()
                  : "Not set"}
              </strong>
            </div>
          </div>
        </section>

        <section className={styles.summarySection}>
          <div>
            <span>Total Actual CBM</span>
            <strong>{totalActualCbm.toFixed(4)}</strong>
          </div>

          <div>
            <span>Total Chargeable CBM</span>
            <strong>
              {totalChargeableCbm.toFixed(4)}
            </strong>
          </div>
        </section>

        <section className={styles.section}>
          <div className={styles.sectionHeader}>
            <div>
              <h2>Shipments</h2>

              <p>
                Customer shipments currently assigned to this
                container.
              </p>
            </div>
          </div>

          {container.shipments.length === 0 ? (
            <div className={styles.emptyState}>
              No shipments are currently assigned to this container.
            </div>
          ) : (
            <div className={styles.tableWrapper}>
              <table className={styles.table}>
                <thead>
                  <tr>
                    <th>Customer</th>
                    <th>Tracking</th>
                    <th>Description</th>
                    <th>Status</th>
                    <th>Received</th>
                    <th>Actual CBM</th>
                    <th>Chargeable CBM</th>
                  </tr>
                </thead>

                <tbody>
                  {container.shipments.map((shipment) => (
                    <tr key={shipment.id}>
                      <td>
                        <Link
                          href={`/customers/${shipment.customer.id}`}
                          className={styles.customerLink}
                        >
                          {shipment.customer.name}
                        </Link>
                      </td>

                      <td>
                        <strong>
                          {shipment.trackingNumber ??
                            shipment.shipmentNumber}
                        </strong>

                        {shipment.trackingNumber && (
                          <small>
                            {shipment.shipmentNumber}
                          </small>
                        )}
                      </td>

                      <td>
                        {shipment.description ?? "Not provided"}
                      </td>

                      <td>
                        <span className={styles.status}>
                          {formatStatus(shipment.status)}
                        </span>
                      </td>

                      <td>
                        {shipment.dateReceived
                          ? shipment.dateReceived.toLocaleDateString()
                          : "Not provided"}
                      </td>

                      <td>
                        {shipment.actualCbm
                          ? shipment.actualCbm.toString()
                          : "—"}
                      </td>

                      <td>
                        {shipment.chargeableCbm
                          ? shipment.chargeableCbm.toString()
                          : "—"}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>
      </div>
    </main>
  );
}

function formatStatus(status: string) {
  return status
    .toLowerCase()
    .split("_")
    .map(
      (word) =>
        word.charAt(0).toUpperCase() + word.slice(1)
    )
    .join(" ");
}