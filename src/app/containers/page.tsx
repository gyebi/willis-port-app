
export const dynamic = "force-dynamic";
import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { requireManagerUser } from "@/lib/auth/require-manager";

import styles from "./page.module.css";

export default async function ContainersPage() {
  await requireManagerUser();

  const containers = await prisma.container.findMany({
    orderBy: [
      {
        estimatedLoadingDate: "desc",
      },
      {
        createdAt: "desc",
      },
    ],
    include: {
      _count: {
        select: {
          shipments: true,
        },
      },
      shipments: {
        select: {
          actualCbm: true,
          chargeableCbm: true,
        },
      },
    },
  });

  const containerRows = containers.map((container) => {
    const actualCbm = container.shipments.reduce(
      (total, shipment) =>
        total + Number(shipment.actualCbm?.toString() ?? 0),
      0
    );

    const chargeableCbm = container.shipments.reduce(
      (total, shipment) =>
        total + Number(shipment.chargeableCbm?.toString() ?? 0),
      0
    );

    return {
      ...container,
      actualCbm,
      chargeableCbm,
    };
  });

  return (
    <main className={styles.page}>
      <div className={styles.container}>
        <Link href="/" className={styles.backLink}>
          ← Back to Dashboard
        </Link>

        <header className={styles.header}>
          <div>
            <p className={styles.eyebrow}>WILLIS PORT</p>
            <h1>Containers</h1>
            <p className={styles.subtitle}>
              Container planning, shipment consolidation, and transit tracking.
            </p>
          </div>

          <Link
            href="/containers/new"
            className={styles.primaryButton}
          >
            + New Container
          </Link>
        </header>

        {containerRows.length === 0 ? (
          <section className={styles.emptyState}>
            <h2>No containers yet</h2>
            <p>
              Containers will appear here once they are created or imported.
            </p>
          </section>
        ) : (
          <section className={styles.containerList}>
            {containerRows.map((container) => (
              <Link
                key={container.id}
                href={`/containers/${container.id}`}
                className={styles.containerCard}
              >
                <div className={styles.mainInfo}>
                  <div>
                    <h2>{container.containerNumber}</h2>

                    <p>
                      {container.shippingMode} ·{" "}
                      {formatStatus(container.status)}
                    </p>
                  </div>

                  <div className={styles.shipmentCount}>
                    <strong>{container._count.shipments}</strong>
                    <span>
                      {container._count.shipments === 1
                        ? "Shipment"
                        : "Shipments"}
                    </span>
                  </div>
                </div>

                <div className={styles.metrics}>
                  <div>
                    <span>Loading Date</span>
                    <strong>
                      {container.estimatedLoadingDate
                        ? container.estimatedLoadingDate.toLocaleDateString()
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
                    <span>Actual CBM</span>
                    <strong>
                      {container.actualCbm.toFixed(4)}
                    </strong>
                  </div>

                  <div>
                    <span>Chargeable CBM</span>
                    <strong>
                      {container.chargeableCbm.toFixed(4)}
                    </strong>
                  </div>
                </div>
              </Link>
            ))}
          </section>
        )}
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
