"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

import styles from "./page.module.css";

type InvoiceReadyShipment = {
  shipmentId: string;
  shipmentPricingId: string;
  trackingNumber: string | null;
  shipmentNumber: string;
  description: string | null;
  customerChargeUsd: string;
  customerChargeGhs: string;
};

type InvoiceReadyShipmentsProps = {
  customerId: string;
  shipments: InvoiceReadyShipment[];
};

export default function InvoiceReadyShipments({
  customerId,
  shipments,
}: InvoiceReadyShipmentsProps) {
  const router = useRouter();

  const [selectedPricingIds, setSelectedPricingIds] = useState<string[]>([]);
  const [isCreating, setIsCreating] = useState(false);
  const [error, setError] = useState("");

  function togglePricing(pricingId: string) {
    setSelectedPricingIds((current) =>
      current.includes(pricingId)
        ? current.filter((id) => id !== pricingId)
        : [...current, pricingId]
    );
  }

  async function handleCreateInvoice() {
    if (selectedPricingIds.length === 0) {
      setError("Select at least one approved shipment.");
      return;
    }

    try {
      setIsCreating(true);
      setError("");

      const response = await fetch(
        `/api/customers/${customerId}/invoices`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            shipmentPricingIds: selectedPricingIds,
          }),
        }
      );

      const result = await response.json();

      if (!response.ok) {
        setError(
          result.message ?? "Unable to create invoice."
        );
        return;
      }

      router.push(`/invoices/${result.invoice.id}`);
      router.refresh();
    } catch (error) {
      console.error("Failed to create invoice:", error);
      setError("Unable to create invoice.");
    } finally {
      setIsCreating(false);
    }
  }

  if (shipments.length === 0) {
    return (
      <section className={styles.section}>
        <h2>Invoice Ready</h2>
        <p>No approved shipment pricing is ready for invoicing.</p>
      </section>
    );
  }

  return (
    <section className={styles.section}>
      <h2>Invoice Ready</h2>

      <div className={styles.tableWrapper}>
        <table className={styles.table}>
          <thead>
            <tr>
              <th>Select</th>
              <th>Tracking</th>
              <th>Description</th>
              <th>USD Charge</th>
              <th>GHS Charge</th>
            </tr>
          </thead>

          <tbody>
            {shipments.map((shipment) => (
              <tr key={shipment.shipmentPricingId}>
                <td>
                  <input
                    type="checkbox"
                    checked={selectedPricingIds.includes(
                      shipment.shipmentPricingId
                    )}
                    onChange={() =>
                      togglePricing(shipment.shipmentPricingId)
                    }
                  />
                </td>

                <td>
                  {shipment.trackingNumber ??
                    shipment.shipmentNumber}
                </td>

                <td>
                  {shipment.description ?? "Not provided"}
                </td>

                <td>
                  ${shipment.customerChargeUsd}
                </td>

                <td>
                  GHS {shipment.customerChargeGhs}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {error && (
        <p className={styles.error}>{error}</p>
      )}

      <div className={styles.actions}>
        <button
          type="button"
          onClick={handleCreateInvoice}
          disabled={
            isCreating || selectedPricingIds.length === 0
          }
        >
          {isCreating
            ? "Creating Invoice..."
            : "Create Invoice from Selected"}
        </button>
      </div>
    </section>
  );
}