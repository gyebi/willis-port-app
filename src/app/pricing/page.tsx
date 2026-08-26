import Link from "next/link";

import { prisma } from "@/lib/prisma";
import { requireManagerUser } from "@/lib/auth/require-manager";

import styles from "../manager-queue.module.css";

export const dynamic = "force-dynamic";

type PricingPageProps = {
  searchParams: Promise<{
    q?: string;
    state?: string;
  }>;
};

type PricingRow = {
  id: string;
  shipmentNumber: string;
  trackingNumber: string | null;
  shippingMode: string;
  customerName: string;
  containerNumber: string | null;
  pricing: {
    id: string;
    status: "DRAFT" | "APPROVED" | "SUPERSEDED";
    pricingBasis: "CBM" | "KG" | "MANUAL";
    billableQuantity: string | null;
    unitRateUsd: string | null;
    manualChargeUsd: string | null;
    customerChargeUsd: string;
    updatedAt: Date;
  } | null;
};

type PricingFilter = "all" | "awaiting" | "draft" | "approved";

export default async function PricingPage({
  searchParams,
}: PricingPageProps) {
  await requireManagerUser();

  const { q = "", state = "all" } = await searchParams;
  const query = q.trim();
  const selectedFilter = parseFilter(state);

  const shipments = (await prisma.shipment.findMany({
    where: query
      ? {
          OR: [
            {
              shipmentNumber: {
                contains: query,
                mode: "insensitive",
              },
            },
            {
              trackingNumber: {
                contains: query,
                mode: "insensitive",
              },
            },
            {
              customer: {
                is: {
                  name: {
                    contains: query,
                    mode: "insensitive",
                  },
                },
              },
            },
            {
              container: {
                is: {
                  containerNumber: {
                    contains: query,
                    mode: "insensitive",
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
      pricings: {
        orderBy: {
          createdAt: "desc",
        },
        take: 1,
      },
    },
  })) as Array<{
    id: string;
    shipmentNumber: string;
    trackingNumber: string | null;
    shippingMode: string;
    customer: {
      name: string;
    } | null;
    container: {
      containerNumber: string;
    } | null;
    pricings: Array<{
      id: string;
      status: "DRAFT" | "APPROVED" | "SUPERSEDED";
      pricingBasis: "CBM" | "KG" | "MANUAL";
      billableQuantity: {
        toString(): string;
      } | null;
      unitRateUsd: {
        toString(): string;
      } | null;
      manualChargeUsd: {
        toString(): string;
      } | null;
      customerChargeUsd: {
        toString(): string;
      };
      updatedAt: Date;
    }>;
  }>;

  const rows: PricingRow[] = shipments.map((shipment) => {
    const pricing = shipment.pricings[0] ?? null;

    return {
      id: shipment.id,
      shipmentNumber: shipment.shipmentNumber,
      trackingNumber: shipment.trackingNumber,
      shippingMode: shipment.shippingMode,
      customerName: shipment.customer?.name ?? "Unassigned",
      containerNumber: shipment.container?.containerNumber ?? null,
      pricing: pricing
        ? {
            id: pricing.id,
            status: pricing.status,
            pricingBasis: pricing.pricingBasis,
            billableQuantity: pricing.billableQuantity?.toString() ?? null,
            unitRateUsd: pricing.unitRateUsd?.toString() ?? null,
            manualChargeUsd: pricing.manualChargeUsd?.toString() ?? null,
            customerChargeUsd: pricing.customerChargeUsd.toString(),
            updatedAt: pricing.updatedAt,
          }
        : null,
    };
  });

  const filteredRows = rows.filter((row) => {
    if (selectedFilter === "all") {
      return true;
    }

    if (selectedFilter === "awaiting") {
      return !row.pricing;
    }

    return row.pricing?.status === selectedFilter.toUpperCase();
  });

  const counts = rows.reduce(
    (acc, row) => {
      if (!row.pricing) {
        acc.awaiting += 1;
        return acc;
      }

      if (row.pricing.status === "DRAFT") {
        acc.draft += 1;
      } else if (row.pricing.status === "APPROVED") {
        acc.approved += 1;
      } else {
        acc.superseded += 1;
      }

      return acc;
    },
    {
      awaiting: 0,
      draft: 0,
      approved: 0,
      superseded: 0,
    }
  );

  return (
    <main className={styles.page}>
      <div className={styles.container}>
        <Link href="/" className={styles.backLink}>
          ← Back to Dashboard
        </Link>

        <header className={styles.header}>
          <div>
            <p className={styles.eyebrow}>WILLIS PORT</p>
            <h1>Pricing Queue</h1>
            <p className={styles.subtitle}>
              Manager work list for shipments awaiting pricing and items already in draft or approved state.
            </p>
          </div>

          <div className={styles.headerActions}>
            <span className={styles.headerBadge}>
              {filteredRows.length.toLocaleString()} visible
            </span>
          </div>
        </header>

        <section className={styles.filterBar}>
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

            <label className={styles.field}>
              Filter
              <select
                name="state"
                defaultValue={selectedFilter}
                className={styles.select}
              >
                <option value="all">All</option>
                <option value="awaiting">Awaiting Pricing</option>
                <option value="draft">Draft</option>
                <option value="approved">Approved</option>
              </select>
            </label>

            <button type="submit" className={styles.button}>
              Search
            </button>

            {query || selectedFilter !== "all" ? (
              <Link href="/pricing" className={styles.secondaryButton}>
                Clear
              </Link>
            ) : null}
          </form>

          <div className={styles.searchMeta}>
            <span className={styles.pill}>Awaiting {counts.awaiting}</span>
            <span className={styles.pill}>Draft {counts.draft}</span>
            <span className={styles.pill}>Approved {counts.approved}</span>
            <span className={styles.pill}>Superseded {counts.superseded}</span>
          </div>
        </section>

        <section className={styles.tableSection}>
          <div className={styles.sectionHeader}>
            <div>
              <h2>Shipment Pricing</h2>
              <p>Open a shipment to continue the existing pricing workflow.</p>
            </div>
          </div>

          {filteredRows.length === 0 ? (
            <div className={styles.emptyState}>
              {query || selectedFilter !== "all"
                ? "No shipments match the current filter."
                : "No shipments are available for pricing yet."}
            </div>
          ) : (
            <div className={styles.tableWrapper}>
              <table className={styles.table}>
                <thead>
                  <tr>
                    <th>Shipment Number</th>
                    <th>Customer</th>
                    <th>Shipping Mode</th>
                    <th>Pricing Basis</th>
                    <th>Billable Quantity</th>
                    <th>Rate</th>
                    <th>Pricing Status</th>
                    <th>Customer Charge</th>
                    <th>Updated Date</th>
                    <th>Action</th>
                  </tr>
                </thead>

                <tbody>
                  {filteredRows.map((row) => (
                    <tr key={row.id}>
                      <td>
                        <Link href={`/shipments/${row.id}`} className={styles.rowLink}>
                          <strong>{row.shipmentNumber}</strong>
                        </Link>
                        {row.trackingNumber ? (
                          <div className={styles.rowSubtext}>
                            {row.trackingNumber}
                          </div>
                        ) : null}
                      </td>

                      <td>{row.customerName}</td>

                      <td>{row.shippingMode}</td>

                      <td>
                        {row.pricing?.pricingBasis ?? "—"}
                      </td>

                      <td>{row.pricing?.billableQuantity ?? "—"}</td>

                      <td>{formatRate(row.pricing)}</td>

                      <td>
                        <span
                          className={`${styles.statusBadge} ${styles[pricingStatusClass(row.pricing)]}`}
                        >
                          {pricingStatusLabel(row.pricing)}
                        </span>
                      </td>

                      <td>
                        {row.pricing
                          ? `USD ${row.pricing.customerChargeUsd}`
                          : "—"}
                      </td>

                      <td>{formatDate(row.pricing?.updatedAt ?? null)}</td>

                      <td>
                        <Link
                          href={`/shipments/${row.id}/pricing`}
                          className={styles.secondaryButton}
                        >
                          {row.pricing ? "Open Pricing" : "Start Pricing"}
                        </Link>
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

function parseFilter(value: string): PricingFilter {
  if (value === "awaiting" || value === "draft" || value === "approved") {
    return value;
  }

  return "all";
}

function formatDate(value: Date | null) {
  return value ? value.toLocaleString() : "—";
}

function formatRate(
  pricing:
    | {
        pricingBasis: "CBM" | "KG" | "MANUAL";
        unitRateUsd: string | null;
        manualChargeUsd: string | null;
      }
    | null
) {
  if (!pricing) {
    return "—";
  }

  if (pricing.pricingBasis === "MANUAL") {
    return pricing.manualChargeUsd ? `USD ${pricing.manualChargeUsd}` : "Manual";
  }

  return pricing.unitRateUsd ? `USD ${pricing.unitRateUsd}` : "—";
}

function pricingStatusLabel(
  pricing:
    | {
        status: "DRAFT" | "APPROVED" | "SUPERSEDED";
      }
    | null
) {
  if (!pricing) {
    return "Awaiting Pricing";
  }

  return pricing.status.replaceAll("_", " ");
}

function pricingStatusClass(
  pricing:
    | {
        status: "DRAFT" | "APPROVED" | "SUPERSEDED";
      }
    | null
) {
  if (!pricing) {
    return "awaiting";
  }

  if (pricing.status === "DRAFT") {
    return "draft";
  }

  if (pricing.status === "APPROVED") {
    return "approved";
  }

  return "superseded";
}
