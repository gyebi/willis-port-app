import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";

import InvoiceReadyShipments from "./InvoiceReadyShipments";
import styles from "./page.module.css";

export const dynamic = "force-dynamic";

type CustomerPageProps = {
  params: Promise<{
    id: string;
  }>;
};

export default async function CustomerPage({
  params,
}: CustomerPageProps) {
  const { id } = await params;

  const customer = await prisma.customer.findUnique({
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
          container: true,
          pricings: {
            where: {
              status: "APPROVED",
            },
            orderBy: {
              approvedAt: "desc",
            },
            take: 1,
          },
        },
      },
    },
  });

  if (!customer) {
    notFound();
  }

  return (
    <main className={styles.page}>
      <div className={styles.container}>
        <Link href="/customers" className={styles.backLink}>
          ← Back to Customers
        </Link>

        <header className={styles.header}>
          <div>
            <p className={styles.eyebrow}>WILLIS PORT</p>
            <h1>{customer.name}</h1>
            <p className={styles.subtitle}>
              Customer shipment and tracking history.
            </p>
          </div>

          <div className={styles.shipmentTotal}>
            <strong>{customer.shipments.length}</strong>
            <span>
              {customer.shipments.length === 1
                ? "Shipment"
                : "Shipments"}
            </span>
          </div>
        </header>

        <section className={styles.section}>
          <h2>Customer Information</h2>

          <div className={styles.infoGrid}>
            <div>
              <span>Phone</span>
              <strong>{customer.phone ?? "Not provided"}</strong>
            </div>

            <div>
              <span>WhatsApp</span>
              <strong>{customer.whatsapp ?? "Not provided"}</strong>
            </div>

            <div>
              <span>Email</span>
              <strong>{customer.email ?? "Not provided"}</strong>
            </div>

            <div>
              <span>Address</span>
              <strong>{customer.address ?? "Not provided"}</strong>
            </div>
          </div>
        </section>

        <section className={styles.section}>
          <div className={styles.sectionHeader}>
            <div>
              <h2>Shipments / Tracking Numbers</h2>
              <p>
                All shipment records associated with this customer.
              </p>
            </div>
            <Link
              href={`/customers/${customer.id}/shipments/new`}
              className={styles.newShipmentButton}
            >
              + New Shipment
            </Link>

          </div>

          {customer.shipments.length === 0 ? (
            <div className={styles.emptyState}>
              No shipments have been recorded for this customer.
            </div>
          ) : (
            <div className={styles.tableWrapper}>
              <table className={styles.table}>
                <thead>
                  <tr>
                    <th>Tracking</th>
                    <th>Description</th>
                    <th>Mode</th>
                    <th>Status</th>
                    <th>Container</th>
                    <th>Received</th>
                    <th>Actual CBM</th>
                    <th>Chargeable CBM</th>
                    <th>Actions</th>
                  </tr>
                </thead>

                <tbody>
                  {customer.shipments.map((shipment) => (
                    <tr key={shipment.id}>
                      <td>
                        <Link href={`/shipments/${shipment.id}`}>
                          <strong>
                            {shipment.trackingNumber ??
                              shipment.shipmentNumber}
                          </strong>
                        </Link>

                        {shipment.trackingNumber && (
                          <small>
                            {shipment.shipmentNumber}
                          </small>
                        )}
                      </td>

                      <td>
                        {shipment.description ?? "Not provided"}
                      </td>

                      <td>{shipment.shippingMode}</td>

                      <td>
                        <span className={styles.status}>
                          {formatStatus(shipment.status)}
                        </span>
                      </td>

                      <td>
                        {shipment.container?.containerNumber ??
                          "Not assigned"}
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

                      <td>
                        <div
                          style={{
                            display: "flex",
                            gap: "1rem",
                            flexWrap: "wrap",
                          }}
                        >
                          <Link
                            href={`/shipments/${shipment.id}`}
                            className={styles.pricingLink}
                          >
                            Edit Shipment
                          </Link>

                          <Link
                            href={`/shipments/${shipment.id}/pricing`}
                            className={styles.pricingLink}
                          >
                            Price Shipment
                          </Link>
                        </div>
                      </td>

                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>

        <InvoiceReadyShipments
          customerId={customer.id}
          shipments={customer.shipments
            .filter((shipment) => shipment.pricings.length > 0)
            .map((shipment) => {
              const pricing = shipment.pricings[0];

              return {
                shipmentId: shipment.id,
                shipmentPricingId: pricing.id,
                trackingNumber: shipment.trackingNumber,
                shipmentNumber: shipment.shipmentNumber,
                description: shipment.description,
                customerChargeUsd:
                  pricing.customerChargeUsd.toString(),
                customerChargeGhs:
                  pricing.customerChargeGhs.toString(),
              };
            })}
        />
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
