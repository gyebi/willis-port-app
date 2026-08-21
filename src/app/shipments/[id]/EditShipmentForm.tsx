
"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import styles from "./page.module.css";
import ShipmentFields from "@/app/customers/[id]/shipments/new/ShipmentFields";

type EditShipmentFormProps = {
  shipment: {
    id: string;
    trackingNumber: string;
    containerId: string | null;
    shippingMode: "SEA" | "AIR" | "UNKNOWN";
    serviceType: "STANDARD" | "EXPRESS";
    goodsCategory: "NORMAL" | "SPECIAL";
    goodsType: string;
    dateReceived: string;
    weightKg: string;
    chargeableWeightKg: string;
    declaredCbm: string;
    actualCbm: string;
    chargeableCbm: string;
    description: string;
  };
  containerOptions: Array<{
    id: string;
    containerNumber: string;
    status: string;
  }>;
};

export default function EditShipmentForm({
  shipment,
  containerOptions,
}: EditShipmentFormProps) {
  const router = useRouter();

  const [isSaving, setIsSaving] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  async function handleSubmit(
    event: FormEvent<HTMLFormElement>
  ) {
    event.preventDefault();

    setIsSaving(true);
    setMessage("");
    setError("");

    const form = new FormData(event.currentTarget);

    try {
      const response = await fetch(
        `/api/shipments/${shipment.id}`,
        {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            trackingNumber: form.get("trackingNumber"),
            description: form.get("description"),
            shippingMode: form.get("shippingMode"),
            serviceType: form.get("serviceType"),
            goodsCategory: form.get("goodsCategory"),
            goodsType: form.get("goodsType"),
            containerId: form.get("containerId"),
            weightKg: form.get("weightKg"),
            chargeableWeightKg: form.get("chargeableWeightKg"),
            declaredCbm: form.get("declaredCbm"),
            actualCbm: form.get("actualCbm"),
            chargeableCbm: form.get("chargeableCbm"),
            dateReceived: form.get("dateReceived"),
          }),
        }
      );

      const result = await response.json();

      if (!response.ok) {
        setError(
          result.message ?? "Unable to update shipment."
        );
        return;
      }

      setMessage("Shipment updated successfully.");

      router.refresh();
    } catch (err) {
      console.error(err);

      setError("Unable to update shipment.");
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <form
      onSubmit={handleSubmit}
      className={styles.form}
    >
      <ShipmentFields
        gridClassName={styles.grid}
        includeMeasurements={true}
          defaults={{
          trackingNumber: shipment.trackingNumber,
          containerId: shipment.containerId ?? "",
          shippingMode: shipment.shippingMode,
          serviceType: shipment.serviceType,
          goodsCategory: shipment.goodsCategory,
          goodsType: shipment.goodsType,
          dateReceived: shipment.dateReceived,
          weightKg: shipment.weightKg,
          chargeableWeightKg: shipment.chargeableWeightKg,
          declaredCbm: shipment.declaredCbm,
          actualCbm: shipment.actualCbm,
          chargeableCbm: shipment.chargeableCbm,
          description: shipment.description,
        }}
        containerOptions={containerOptions}
      />

      {message && (
        <p className={styles.message}>
          {message}
        </p>
      )}

      {error && (
        <p className={styles.error}>
          {error}
        </p>
      )}

      <div className={styles.actions}>
        <button
          type="submit"
          disabled={isSaving}
          className={styles.saveButton}
        >
          {isSaving
            ? "Saving..."
            : "Save Shipment"}
        </button>

        <Link
          href={`/shipments/${shipment.id}/pricing`}
          className={styles.priceButton}
        >
          Price Shipment
        </Link>
      </div>
    </form>
  );
}
