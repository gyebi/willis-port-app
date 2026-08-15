"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";

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
            goodsType: form.get("goodsType"),
            weightKg: form.get("weightKg"),
            declaredCbm: form.get("declaredCbm"),
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
      <div className={styles.grid}>
        <div>
          <label htmlFor="trackingNumber">
            Tracking Number
          </label>

          <input
            id="trackingNumber"
            name="trackingNumber"
            type="text"
          />
        </div>

        <div>
          <label htmlFor="shippingMode">
            Shipping Mode
          </label>

          <select
            id="shippingMode"
            name="shippingMode"
            defaultValue="UNKNOWN"
          >
            <option value="UNKNOWN">
              Not yet known
            </option>

            <option value="SEA">Sea</option>

            <option value="AIR">Air</option>
          </select>
        </div>

        <div>
          <label htmlFor="goodsType">
            Goods Type
          </label>

          <input
            id="goodsType"
            name="goodsType"
            type="text"
            placeholder="Normal, Electronics..."
          />
        </div>

        <div>
          <label htmlFor="dateReceived">
            Date Received
          </label>

          <input
            id="dateReceived"
            name="dateReceived"
            type="date"
          />
        </div>

        <div>
          <label htmlFor="weightKg">
            Weight (kg)
          </label>

          <input
            id="weightKg"
            name="weightKg"
            type="number"
            min="0"
            step="0.001"
          />
        </div>

        <div>
          <label htmlFor="declaredCbm">
            CBM
          </label>

          <input
            id="declaredCbm"
            name="declaredCbm"
            type="number"
            min="0"
            step="0.0001"
          />
        </div>
      </div>

      <div>
        <label htmlFor="description">
          Description
        </label>

        <textarea
          id="description"
          name="description"
          rows={4}
        />
      </div>

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