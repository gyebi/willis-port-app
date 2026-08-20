"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import ShipmentFields from "./ShipmentFields";
import styles from "./page.module.css";

type NewShipmentFormProps = {
  customerId: string;
};

export default function NewShipmentForm({
  customerId,
}: NewShipmentFormProps) {
  const router = useRouter();

  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState("");

  async function handleSubmit(
    event: FormEvent<HTMLFormElement>
  ) {
    event.preventDefault();

    setIsSaving(true);
    setError("");

    const form = new FormData(event.currentTarget);

    try {
      const response = await fetch(
        `/api/customers/${customerId}/shipments`,
        {
          method: "POST",
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
          result.message ?? "Unable to create shipment."
        );
        return;
      }

      router.push(`/customers/${customerId}`);
      router.refresh();
    } catch (err) {
      console.error(err);

      setError(
        "Unable to create shipment. Please try again."
      );
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <form
      className={styles.form}
      onSubmit={handleSubmit}
    >
      <ShipmentFields gridClassName={styles.grid} />

      {error && (
        <p className={styles.error}>{error}</p>
      )}

      <div className={styles.actions}>
        <button
          type="submit"
          disabled={isSaving}
        >
          {isSaving
            ? "Creating..."
            : "Create Shipment"}
        </button>
      </div>
    </form>
  );
}
