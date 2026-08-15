"use client";

import { FormEvent, useMemo, useState } from "react";

import styles from "./page.module.css";

type PricingBasis = "CBM" | "KG" | "MANUAL";

type PricingFormProps = {
  shipmentId: string;
  weightKg: string;
  actualCbm: string;
  chargeableCbm: string;

  latestPricing: {
    id: string;
    status: "DRAFT" | "APPROVED" | "SUPERSEDED";
    pricingBasis: PricingBasis;
    chargeableWeightKg: string;
    unitRateUsd: string;
    manualChargeUsd: string;
    exchangeRateToGhs: string;
    notes: string;
  } | null;
};

export default function PricingForm({
  shipmentId,
  weightKg,
  actualCbm,
  chargeableCbm,
  latestPricing,
}: PricingFormProps) {
  const [pricingBasis, setPricingBasis] =
    useState<PricingBasis>(
      latestPricing?.pricingBasis ?? "CBM"
    );

  const [chargeableWeightKg, setChargeableWeightKg] =
    useState(
      latestPricing?.chargeableWeightKg || weightKg
    );

  const [unitRateUsd, setUnitRateUsd] =
    useState(latestPricing?.unitRateUsd ?? "");

  const [manualChargeUsd, setManualChargeUsd] =
    useState(latestPricing?.manualChargeUsd ?? "");

  const [exchangeRateToGhs, setExchangeRateToGhs] =
    useState(
      latestPricing?.exchangeRateToGhs ?? "1"
    );

  const [notes, setNotes] =
    useState(latestPricing?.notes ?? "");

  const [pricingId, setPricingId] = useState<
    string | null
  >(latestPricing?.id ?? null);

  const [pricingStatus, setPricingStatus] = useState<
    "DRAFT" | "APPROVED" | "SUPERSEDED" | null
  >(latestPricing?.status ?? null);

  const [isSaving, setIsSaving] = useState(false);
  const [isApproving, setIsApproving] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  const isApproved = pricingStatus === "APPROVED";

  const preview = useMemo(() => {
    const exchangeRate = Number(exchangeRateToGhs || 0);

    if (pricingBasis === "CBM") {
      const quantity = Number(chargeableCbm || 0);
      const rate = Number(unitRateUsd || 0);

      const usd = quantity * rate;

      return {
        quantity,
        usd,
        ghs: usd * exchangeRate,
      };
    }

    if (pricingBasis === "KG") {
      const quantity = Number(chargeableWeightKg || 0);
      const rate = Number(unitRateUsd || 0);

      const usd = quantity * rate;

      return {
        quantity,
        usd,
        ghs: usd * exchangeRate,
      };
    }

    const usd = Number(manualChargeUsd || 0);

    return {
      quantity: 1,
      usd,
      ghs: usd * exchangeRate,
    };
  }, [
    pricingBasis,
    chargeableCbm,
    chargeableWeightKg,
    unitRateUsd,
    manualChargeUsd,
    exchangeRateToGhs,
  ]);

  async function handleSubmit(
    event: FormEvent<HTMLFormElement>
  ) {
    event.preventDefault();

    if (isApproved) {
      return;
    }

    setIsSaving(true);
    setMessage("");
    setError("");

    try {
      const response = await fetch(
        `/api/shipments/${shipmentId}/pricing`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            pricingBasis,
            chargeableWeightKg,
            unitRateUsd,
            manualChargeUsd,
            exchangeRateToGhs,
            notes,
          }),
        }
      );

      const result = await response.json();

      if (!response.ok) {
        setError(
          result.message ?? "Unable to save pricing."
        );
        return;
      }

      setPricingId(result.pricing.id);
      setPricingStatus("DRAFT");
      setMessage("Shipment pricing saved.");
    } catch (err) {
      console.error(err);

      setError(
        "Unable to save shipment pricing."
      );
    } finally {
      setIsSaving(false);
    }
  }

  async function handleApprovePricing() {
    if (!pricingId) {
      setError("Save draft pricing before approval.");
      return;
    }

    try {
      setIsApproving(true);
      setMessage("");
      setError("");

      const response = await fetch(
        `/api/shipment-pricing/${pricingId}/approve`,
        {
          method: "POST",
        }
      );

      const result = await response.json();

      if (!response.ok) {
        setError(
          result.message ?? "Unable to approve pricing."
        );
        return;
      }

      setPricingStatus("APPROVED");
      setMessage("Shipment pricing approved.");
    } catch (error) {
      console.error(
        "Failed to approve shipment pricing:",
        error
      );

      setError(
        "Unable to approve shipment pricing."
      );
    } finally {
      setIsApproving(false);
    }
  }

  return (
    <form
      className={styles.section}
      onSubmit={handleSubmit}
    >
      <h2>Financial Calculation</h2>

      <div className={styles.grid}>
        <div>
          <label htmlFor="pricingBasis">
            Pricing Basis
          </label>

          <select
            id="pricingBasis"
            value={pricingBasis}
            disabled={isApproved}
            onChange={(event) =>
              setPricingBasis(
                event.target.value as PricingBasis
              )
            }
          >
            <option value="CBM">CBM</option>
            <option value="KG">KG</option>
            <option value="MANUAL">
              Manual / Special
            </option>
          </select>
        </div>

        <div>
          <span>Actual CBM</span>
          <strong>{actualCbm || "Not provided"}</strong>
        </div>
      </div>

      {pricingBasis === "CBM" && (
        <div className={styles.grid}>
          <div>
            <span>Chargeable CBM</span>
            <strong>
              {chargeableCbm || "Not provided"}
            </strong>
          </div>

          <div>
            <label htmlFor="unitRateUsd">
              Rate per CBM (USD)
            </label>

            <input
              id="unitRateUsd"
              type="number"
              min="0"
              step="0.01"
              value={unitRateUsd}
              disabled={isApproved}
              onChange={(event) =>
                setUnitRateUsd(event.target.value)
              }
            />
          </div>
        </div>
      )}

      {pricingBasis === "KG" && (
        <div className={styles.grid}>
          <div>
            <span>Actual Weight</span>
            <strong>
              {weightKg
                ? `${weightKg} kg`
                : "Not provided"}
            </strong>
          </div>

          <div>
            <label htmlFor="chargeableWeightKg">
              Chargeable Weight (kg)
            </label>

            <input
              id="chargeableWeightKg"
              type="number"
              min="0"
              step="0.001"
              value={chargeableWeightKg}
              disabled={isApproved}
              onChange={(event) =>
                setChargeableWeightKg(
                  event.target.value
                )
              }
            />
          </div>

          <div>
            <label htmlFor="kgRate">
              Rate per KG (USD)
            </label>

            <input
              id="kgRate"
              type="number"
              min="0"
              step="0.01"
              value={unitRateUsd}
              disabled={isApproved}
              onChange={(event) =>
                setUnitRateUsd(event.target.value)
              }
            />
          </div>
        </div>
      )}

      {pricingBasis === "MANUAL" && (
        <div>
          <label htmlFor="manualChargeUsd">
            Manual Charge (USD)
          </label>

          <input
            id="manualChargeUsd"
            type="number"
            min="0"
            step="0.01"
            value={manualChargeUsd}
            disabled={isApproved}
            onChange={(event) =>
              setManualChargeUsd(event.target.value)
            }
          />
        </div>
      )}

      <div className={styles.grid}>
        <div>
          <label htmlFor="exchangeRate">
            USD → GHS Exchange Rate
          </label>

          <input
            id="exchangeRate"
            type="number"
            min="0.000001"
            step="0.000001"
            value={exchangeRateToGhs}
            disabled={isApproved}
            onChange={(event) =>
              setExchangeRateToGhs(
                event.target.value
              )
            }
          />
        </div>

        <div>
          <label htmlFor="notes">
            Pricing Notes
          </label>

          <input
            id="notes"
            type="text"
            value={notes}
            disabled={isApproved}
            onChange={(event) =>
              setNotes(event.target.value)
            }
          />
        </div>
      </div>

      <div className={styles.totalBox}>
        <span>Preview Customer Charge</span>

        <strong>
          ${preview.usd.toFixed(2)} USD
        </strong>

        <small>
          GHS {preview.ghs.toFixed(2)}
        </small>
      </div>

      {message && (
        <p className={styles.success}>{message}</p>
      )}

      {error && (
        <p className={styles.error}>{error}</p>
      )}

      <div className={styles.actions}>
        {!isApproved && (
          <button
            type="submit"
            disabled={isSaving || isApproving}
          >
            {isSaving
              ? "Saving..."
              : "Save Draft Pricing"}
          </button>
        )}

        {pricingStatus === "DRAFT" && pricingId && (
          <button
            type="button"
            onClick={handleApprovePricing}
            disabled={isSaving || isApproving}
            className={styles.approveButton}
          >
            {isApproving
              ? "Approving..."
              : "Approve Pricing"}
          </button>
        )}

        {isApproved && (
          <div className={styles.approvedBadge}>
            Approved
          </div>
        )}
      </div>
    </form>
  );
}
