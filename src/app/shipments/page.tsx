import Link from "next/link";

import { prisma } from "@/lib/prisma";
import { requireManagerUser } from "@/lib/auth/require-manager";

import styles from "../manager-queue.module.css";

export const dynamic = "force-dynamic";

type ShipmentsPageProps = {
  searchParams: Promise<{
    q?: string;
  }>;
};

type ShipmentRow = {
  id: string;
  shipmentNumber: string;
  trackingNumber: string | null;
  description: string | null;
  shippingMode: string;
  containerNumber: string | null;
  dateReceived: Date | null;
  estimatedLoadingDate: Date | null;
  eta: Date | null;
  collectionDate: Date | null;
  status: string;
  customer: {
    name: string;
  } | null;
  enteredByUser: {
    displayName: string | null;
    email: string;
  } | null;
};

export default async function ShipmentsPage({
  searchParams,
}: ShipmentsPageProps) {
  await requireManagerUser();

  const { q = "" } = await searchParams;
  const query = q.trim();
  const insensitive = "insensitive" as const;

  const shipmentQueryRows = (await prisma.shipment.findMany({
    where: query
      ? {
          OR: [
            {
              shipmentNumber: {
                contains: query,
                mode: insensitive,
              },
            },
            {
              trackingNumber: {
                contains: query,
                mode: insensitive,
              },
            },
            {
              customer: {
                is: {
                  name: {
                    contains: query,
                    mode: insensitive,
                  },
                },
              },
            },
            {
              container: {
                is: {
                  containerNumber: {
                    contains: query,
                    mode: insensitive,
                  },
                },
              },
            },
          ],
        }
      : undefined,
    orderBy: [
      {
        dateReceived: "desc",
      },
      {
        createdAt: "desc",
      },
    ],
    include: {
      customer: {
        select: {
          name: true,
        },
      },
      container: {
        select: {
          containerNumber: true,
        },
      },
      enteredByUser: {
        select: {
          displayName: true,
          email: true,
        },
      },
    },
  })) as unknown as Array<{
    id: string;
    shipmentNumber: string;
    trackingNumber: string | null;
    description: string | null;
    shippingMode: string;
    dateReceived: Date | null;
    estimatedLoadingDate: Date | null;
    eta: Date | null;
    collectionDate: Date | null;
    status: string;
    customer: {
      name: string;
    } | null;
    container: {
      containerNumber: string;
    } | null;
    enteredByUser: {
      displayName: string | null;
      email: string;
    } | null;
  }>;

  const shipments: ShipmentRow[] = shipmentQueryRows.map((shipment) => ({
    id: shipment.id,
    shipmentNumber: shipment.shipmentNumber,
    trackingNumber: shipment.trackingNumber,
    description: shipment.description,
    shippingMode: shipment.shippingMode,
    containerNumber: shipment.container?.containerNumber ?? null,
    dateReceived: shipment.dateReceived,
    estimatedLoadingDate: shipment.estimatedLoadingDate,
    eta: shipment.eta,
    collectionDate: shipment.collectionDate,
    status: shipment.status,
    customer: shipment.customer,
    enteredByUser: shipment.enteredByUser,
  }));

  return (
    <main className={styles.page}>
      <div className={styles.container}>
        <Link href="/" className={styles.backLink}>
          ← Back to Dashboard
        </Link>

        <header className={styles.header}>
          <div>
            <p className={styles.eyebrow}>WILLIS PORT</p>
            <h1>Shipments Queue</h1>
            <p className={styles.subtitle}>
              Manager work list for active shipment records and operational tracking.
            </p>
          </div>

          <div className={styles.headerActions}>
            <span className={styles.headerBadge}>
              {shipments.length.toLocaleString()} records
            </span>
          </div>
        </header>

        <section className={styles.toolbar}>
          <form method="get" className={styles.searchForm}>
            <label className={styles.field}>
              Search shipment number, tracking number, customer or container...
              <input
                type="search"
                name="q"
                defaultValue={query}
                placeholder="Search shipment number, tracking number, customer or container..."
                className={styles.input}
              />
            </label>

            <button type="submit" className={styles.button}>
              Search
            </button>

            {query ? (
              <Link href="/shipments" className={styles.secondaryButton}>
                Clear
              </Link>
            ) : null}
          </form>

          <div className={styles.searchMeta}>
            <span className={styles.pill}>Shipment Number</span>
            <span className={styles.pill}>Tracking Number</span>
            <span className={styles.pill}>Customer Name</span>
            <span className={styles.pill}>Container Number</span>
          </div>
        </section>

        <section className={styles.tableSection}>
          <div className={styles.sectionHeader}>
            <div>
              <h2>Shipment Records</h2>
              <p>Select a shipment to open the existing detail workspace.</p>
            </div>
          </div>

          {shipments.length === 0 ? (
            <div className={styles.emptyState}>
              {query
                ? "No shipments match the current search."
                : "No shipment records are available yet."}
            </div>
          ) : (
            <div className={styles.tableWrapper}>
              <table className={styles.table}>
                <thead>
                  <tr>
                    <th>Shipment Number</th>
                    <th>Tracking Number</th>
                    <th>Customer</th>
                    <th>Description</th>
                    <th>Shipping Mode</th>
                    <th>Container</th>
                    <th>Date Received</th>
                    <th>Effective Loading Date</th>
                    <th>ETA</th>
                    <th>Collection Date</th>
                    <th>Status</th>
                    <th>Entered By</th>
                  </tr>
                </thead>

                <tbody>
                  {shipments.map((shipment) => (
                    <tr key={shipment.id}>
                      <td>
                        <Link href={`/shipments/${shipment.id}`} className={styles.rowLink}>
                          <strong>{shipment.shipmentNumber}</strong>
                        </Link>
                      </td>

                      <td>
                        {shipment.trackingNumber ?? "—"}
                        {shipment.trackingNumber ? (
                          <div className={styles.rowSubtext}>
                            {shipment.shipmentNumber}
                          </div>
                        ) : null}
                      </td>

                      <td>
                        <span className={styles.stack}>
                          <strong>{shipment.customer?.name ?? "Unassigned"}</strong>
                        </span>
                      </td>

                      <td>{shipment.description ?? "Not provided"}</td>

                      <td>{shipment.shippingMode}</td>

                      <td>{shipment.containerNumber ?? "Not assigned"}</td>

                      <td>{formatDate(shipment.dateReceived)}</td>

                      <td>{formatDate(shipment.estimatedLoadingDate)}</td>

                      <td>{formatDate(shipment.eta)}</td>

                      <td>{formatDate(shipment.collectionDate)}</td>

                      <td>
                        <span
                          className={`${styles.statusBadge} ${styles[statusClass(shipment.status)]}`}
                        >
                          {formatStatus(shipment.status)}
                        </span>
                      </td>

                      <td>
                        <div className={styles.stack}>
                          <strong>
                            {shipment.enteredByUser?.displayName ??
                              shipment.enteredByUser?.email ??
                              "Unknown"}
                          </strong>
                        </div>
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

function formatDate(value: Date | null) {
  return value ? value.toLocaleDateString() : "—";
}

function formatStatus(status: string) {
  return status
    .toLowerCase()
    .split("_")
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");
}

function statusClass(status: string) {
  if (status === "RECEIVED" || status === "ORIGIN") {
    return "awaiting";
  }

  if (status === "LOADING_SCHEDULED") {
    return "draft";
  }

  if (status === "IN_TRANSIT" || status === "WAREHOUSE") {
    return "sent";
  }

  if (status === "CUSTOMS_CLEARANCE") {
    return "approved";
  }

  if (status === "DELIVERED") {
    return "paid";
  }

  if (status === "CANCELLED") {
    return "cancelled";
  }

  return "awaiting";
}
