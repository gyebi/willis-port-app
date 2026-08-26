"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";

import ShipmentFields from "@/app/customers/[id]/shipments/new/ShipmentFields";
import {
  formatDateOnly,
  formatDaysLeftLabel,
  resolveShipmentSchedule,
} from "@/lib/shipment-scheduling";

import styles from "./page.module.css";

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
    calculatedEstimatedLoadingDate: string;
    estimatedLoadingDate: string;
    estimatedLoadingDateOverride: string;
    estimatedLoadingOverrideReason: string;
    estimatedLoadingOverrideAt: string;
    estimatedLoadingOverrideByUser: {
      displayName: string | null;
      email: string;
      role: string;
    } | null;
    sortingCompleteDate: string;
    collectionDate: string;
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

  const schedule = resolveShipmentSchedule({
    dateReceived: shipment.dateReceived,
    calculatedEstimatedLoadingDate:
      shipment.calculatedEstimatedLoadingDate,
    estimatedLoadingDate: shipment.estimatedLoadingDate,
    estimatedLoadingDateOverride:
      shipment.estimatedLoadingDateOverride || null,
  });

  const [isSaving, setIsSaving] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [overrideEnabled, setOverrideEnabled] = useState(
    Boolean(shipment.estimatedLoadingDateOverride)
  );
  const [overrideDate, setOverrideDate] = useState(
    shipment.estimatedLoadingDateOverride
  );
  const [overrideReason, setOverrideReason] = useState(
    shipment.estimatedLoadingOverrideReason
  );

  async function handleSubmit(
    event: FormEvent<HTMLFormElement>
  ) {
    event.preventDefault();

    setIsSaving(true);
    setMessage("");
    setError("");

    const form = new FormData(event.currentTarget);

    try {
      const response = await fetch(`/api/shipments/${shipment.id}`, {
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
          estimatedLoadingDateOverride: overrideEnabled
            ? overrideDate
            : "",
          estimatedLoadingOverrideReason: overrideEnabled
            ? overrideReason
            : "",
        }),
      });

      const result = await response.json();

      if (!response.ok) {
        setError(result.message ?? "Unable to update shipment.");
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

  const overrideAuditLabel = shipment.estimatedLoadingOverrideByUser
    ? `${shipment.estimatedLoadingOverrideByUser.displayName ?? shipment.estimatedLoadingOverrideByUser.email} · ${shipment.estimatedLoadingOverrideByUser.role}`
    : null;

  return (
    <form onSubmit={handleSubmit} className={styles.form}>
      <section className={styles.scheduleSection}>
        <div className={styles.scheduleHeader}>
          <div>
            <h3>Operational Schedule</h3>
            <p>
              The schedule below follows the confirmed loading, arrival, sorting
              and collection rules. Managers can override the loading date.
            </p>
          </div>
        </div>

        <div className={styles.scheduleGrid}>
          <div className={styles.scheduleCard}>
            <span>Date Received</span>
            <strong>{formatDateOnly(schedule.dateReceived)}</strong>
          </div>

          <div className={styles.scheduleCard}>
            <span>Calculated Loading Date</span>
            <strong>
              {formatDateOnly(schedule.calculatedEstimatedLoadingDate)}
            </strong>
          </div>

          <div className={styles.scheduleCard}>
            <span>Effective Loading Date</span>
            <strong>
              {formatDateOnly(schedule.effectiveEstimatedLoadingDate)}
            </strong>
          </div>

          <div className={styles.scheduleCard}>
            <span>ETA (Arrival)</span>
            <strong>{formatDateOnly(schedule.eta)}</strong>
          </div>

          <div className={styles.scheduleCard}>
            <span>Sorting Complete</span>
            <strong>{formatDateOnly(schedule.sortingCompleteDate)}</strong>
          </div>

          <div className={styles.scheduleCard}>
            <span>Collection Date</span>
            <strong>{formatDateOnly(schedule.collectionDate)}</strong>
          </div>

          <div className={styles.scheduleCard}>
            <span>Month</span>
            <strong>{schedule.monthLabel}</strong>
          </div>

          <div className={styles.scheduleCard}>
            <span>Days Left</span>
            <strong>{formatDaysLeftLabel(schedule.daysLeftToCollection)}</strong>
          </div>
        </div>

        <div className={styles.overridePanel}>
          <label className={styles.toggleRow}>
            <input
              type="checkbox"
              checked={overrideEnabled}
              onChange={(event) => setOverrideEnabled(event.target.checked)}
            />
            <span>Manager override loading date</span>
          </label>

          <div className={styles.formGrid}>
            <label>
              Override Loading Date
              <input
                type="date"
                value={overrideDate}
                onChange={(event) => setOverrideDate(event.target.value)}
                disabled={!overrideEnabled}
              />
            </label>

            <label>
              Override Reason
              <input
                type="text"
                value={overrideReason}
                onChange={(event) => setOverrideReason(event.target.value)}
                disabled={!overrideEnabled}
                placeholder="Container delay, vessel change, etc."
              />
            </label>
          </div>

          {shipment.estimatedLoadingDateOverride ? (
            <p className={styles.auditNote}>
              Override saved on{" "}
              {shipment.estimatedLoadingOverrideAt
                ? new Date(shipment.estimatedLoadingOverrideAt).toLocaleString()
                : "an unknown time"}
              {overrideAuditLabel ? ` by ${overrideAuditLabel}` : ""}
              {shipment.estimatedLoadingOverrideReason
                ? `. Reason: ${shipment.estimatedLoadingOverrideReason}`
                : ""}
            </p>
          ) : (
            <p className={styles.auditNote}>
              No loading-date override is currently saved.
            </p>
          )}
        </div>
      </section>

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

      {message ? <p className={styles.message}>{message}</p> : null}
      {error ? <p className={styles.error}>{error}</p> : null}

      <div className={styles.actions}>
        <button type="submit" disabled={isSaving} className={styles.saveButton}>
          {isSaving ? "Saving..." : "Save Shipment"}
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
