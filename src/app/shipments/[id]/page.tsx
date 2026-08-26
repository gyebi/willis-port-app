import Link from "next/link";
import { notFound } from "next/navigation";

import { prisma } from "@/lib/prisma";
import { requireManagerUser } from "@/lib/auth/require-manager";

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
  await requireManagerUser();

  const { id } = await params;

  const shipment = await prisma.shipment.findUnique({
    where: { id },
    include: {
      customer: true,
      container: true, enteredByUser: {
        select: {
          displayName: true,
          email: true,
          role: true,
        },
      }, estimatedLoadingOverrideByUser: {
        select: {
          displayName: true,
          email: true,
          role: true,
        },
      },
    },
  });

  const containerOptions = await prisma.container.findMany({
    orderBy: {
      containerNumber: "asc",
    },
    select: {
      id: true,
      containerNumber: true,
      status: true,
    },
  });

  if (!shipment) {
    notFound();
  }

  return (
    <main className={styles.page}>
      <div className={styles.container}>
        <Link href="/" className={styles.backLink}>
          ← Back to Dashboard
        </Link>

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

          {shipment.enteredByUser ? (
            <p className={styles.enteredBy}>
              Entered by:{" "}
              <strong>
                {shipment.enteredByUser.displayName ??
                  shipment.enteredByUser.email}
              </strong>
              {" · "}
              {shipment.enteredByUser.role}
            </p>
          ) : null}
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
              containerId: shipment.containerId,
              shippingMode:
                shipment.shippingMode,
              serviceType: shipment.serviceType,
              goodsCategory: shipment.goodsCategory,
              goodsType:
                shipment.goodsType ?? "",
              dateReceived:
                shipment.dateReceived
                  ? shipment.dateReceived
                    .toISOString()
                    .slice(0, 10)
                  : "",
              calculatedEstimatedLoadingDate:
                shipment.calculatedEstimatedLoadingDate
                  ? shipment.calculatedEstimatedLoadingDate
                    .toISOString()
                    .slice(0, 10)
                  : "",
              estimatedLoadingDate:
                shipment.estimatedLoadingDate
                  ? shipment.estimatedLoadingDate
                    .toISOString()
                    .slice(0, 10)
                  : "",
              estimatedLoadingDateOverride:
                shipment.estimatedLoadingDateOverride
                  ? shipment.estimatedLoadingDateOverride
                    .toISOString()
                    .slice(0, 10)
                  : "",
              estimatedLoadingOverrideReason:
                shipment.estimatedLoadingOverrideReason ?? "",
              estimatedLoadingOverrideAt:
                shipment.estimatedLoadingOverrideAt
                  ? shipment.estimatedLoadingOverrideAt
                    .toISOString()
                  : "",
              estimatedLoadingOverrideByUser:
                shipment.estimatedLoadingOverrideByUser
                  ? {
                      displayName:
                        shipment.estimatedLoadingOverrideByUser
                          .displayName,
                      email:
                        shipment.estimatedLoadingOverrideByUser
                          .email,
                      role:
                        shipment.estimatedLoadingOverrideByUser.role,
                    }
                  : null,
              sortingCompleteDate:
                shipment.sortingCompleteDate
                  ? shipment.sortingCompleteDate
                    .toISOString()
                    .slice(0, 10)
                  : "",
              collectionDate:
                shipment.collectionDate
                  ? shipment.collectionDate
                    .toISOString()
                    .slice(0, 10)
                  : "",
              weightKg:
                shipment.weightKg?.toString() ?? "",
              chargeableWeightKg:
                shipment.chargeableWeightKg?.toString() ?? "",
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
            containerOptions={containerOptions}
          />
        </section>
      </div>
    </main>
  );
}
