import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";

import PricingForm from "./PricingForm";
import styles from "./page.module.css";

export const dynamic = "force-dynamic";

type PricingPageProps = {
  params: Promise<{
    id: string;
  }>;
};

export default async function PricingPage({
  params,
}: PricingPageProps) {
  const { id } = await params;

  const shipment = await prisma.shipment.findUnique({
    where: {
      id,
    },
    include: {
      customer: true,
      pricings: {
        orderBy: {
          createdAt: "desc",
        },
        take: 1,
      },
    },
  });

  if (!shipment) {
    notFound();
  }

  const latestPricing = shipment.pricings[0] ?? null;

  return (
    <main className={styles.page}>
      <div className={styles.container}>
        <Link
          href={`/customers/${shipment.customer.id}`}
          className={styles.backLink}
        >
          ← Back to Customer
        </Link>

        <header className={styles.header}>
          <p className={styles.eyebrow}>WILLIS PORT</p>

          <h1>Price Shipment</h1>

          <p>
            {shipment.customer.name} ·{" "}
            {shipment.trackingNumber ?? shipment.shipmentNumber}

          </p>
        </header>

        <section className={styles.section}>
          <h2>Shipment Information</h2>

          <div className={styles.grid}>
            <div>
              <span>Description</span>
              <strong>
                {shipment.description ?? "Not provided"}
              </strong>
            </div>

            <div>
              <span>Shipping Mode</span>
              <strong>{shipment.shippingMode}</strong>
            </div>

            <div>
              <span>Weight</span>
              <strong>
                {shipment.weightKg
                  ? `${shipment.weightKg.toString()} kg`
                  : "Not provided"}
              </strong>
            </div>

            <div>
              <span>Actual CBM</span>
              <strong>
                {shipment.actualCbm
                  ? shipment.actualCbm.toString()
                  : "Not provided"}
              </strong>
            </div>

            <div>
              <span>Chargeable CBM</span>
              <strong>
                {shipment.chargeableCbm
                  ? shipment.chargeableCbm.toString()
                  : "Not provided"}
              </strong>
            </div>
          </div>
        </section>


        <PricingForm
          shipmentId={shipment.id}
          shippingMode={shipment.shippingMode}
          serviceType={shipment.serviceType}
          goodsCategory={shipment.goodsCategory}
          weightKg={shipment.weightKg?.toString() ?? ""}
          chargeableWeightKg={
            shipment.chargeableWeightKg?.toString() ?? ""
          }
          actualCbm={shipment.actualCbm?.toString() ?? ""}
          chargeableCbm={shipment.chargeableCbm?.toString() ?? ""}

          latestPricing={
            latestPricing
              ? {
                id: latestPricing.id,
                status: latestPricing.status,
                pricingBasis: latestPricing.pricingBasis,
                chargeableWeightKg:
                  latestPricing.chargeableWeightKg?.toString() ?? "",

                unitRateUsd:
                  latestPricing.unitRateUsd?.toString() ?? "",

                manualChargeUsd:
                  latestPricing.manualChargeUsd?.toString() ?? "",

               

                handlingChargeUsd:
                  latestPricing.handlingChargeUsd?.toString() ?? "",

                documentationChargeUsd:
                  latestPricing.documentationChargeUsd?.toString() ?? "",

                specialHandlingChargeUsd:
                  latestPricing.specialHandlingChargeUsd?.toString() ?? "",

                deliveryChargeUsd:
                  latestPricing.deliveryChargeUsd?.toString() ?? "",

                otherChargeDescription:
                  latestPricing.otherChargeDescription ?? "",

                otherChargeUsd:
                  latestPricing.otherChargeUsd?.toString() ?? "",

                exchangeRateToGhs:
                  latestPricing.exchangeRateToGhs.toString(),

                notes:
                  latestPricing.notes ?? "",
              }
              : null
          }
        />
      </div>
    </main>
  );
}
