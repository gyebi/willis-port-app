"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";

import styles from "./page.module.css";

type PricingBasis = "CBM" | "KG" | "MANUAL";

type ShippingRate = {
  pricingBasis: PricingBasis;
  rateUsd: string;
  unit: string;
};

type PricingFormProps = {
  shipmentId: string;
  shippingMode: string;
  serviceType: string;
  goodsCategory: string;
  weightKg: string;
  chargeableWeightKg: string;
  actualCbm: string;
  chargeableCbm: string;
  shippingRate: ShippingRate | null;
  rateError: string | null;
  latestPricing: {
    id: string;
    status: "DRAFT" | "APPROVED" | "SUPERSEDED";
    pricingBasis: PricingBasis;
    chargeableWeightKg: string;
    unitRateUsd: string;
    manualChargeUsd: string;
    handlingChargeUsd: string;
    documentationChargeUsd: string;
    specialHandlingChargeUsd: string;
    deliveryChargeUsd: string;
    otherChargeDescription: string;
    otherChargeUsd: string;
    exchangeRateToGhs: string;
    notes: string;
  } | null;
};

export default function PricingForm({
  shipmentId,
  shippingMode,
  serviceType,
  goodsCategory,
  weightKg,
  chargeableWeightKg,
  actualCbm,
  chargeableCbm,
  shippingRate,
  rateError,
  latestPricing,
}: PricingFormProps) {
  const [pricingBasis, setPricingBasis] = useState<PricingBasis>(
    latestPricing?.pricingBasis ?? shippingRate?.pricingBasis ?? "MANUAL"
  );
  const [manualChargeUsd, setManualChargeUsd] = useState(
    latestPricing?.manualChargeUsd ?? ""
  );
  const [exchangeRateToGhs, setExchangeRateToGhs] = useState(
    latestPricing?.exchangeRateToGhs ?? "1"
  );
  const [notes, setNotes] = useState(latestPricing?.notes ?? "");
  const [pricingId, setPricingId] = useState<string | null>(
    latestPricing?.id ?? null
  );
  const [pricingStatus, setPricingStatus] = useState<
    "DRAFT" | "APPROVED" | "SUPERSEDED" | null
  >(latestPricing?.status ?? null);
  const [handlingChargeUsd, setHandlingChargeUsd] = useState(
    latestPricing?.handlingChargeUsd ?? ""
  );
  const [documentationChargeUsd, setDocumentationChargeUsd] = useState(
    latestPricing?.documentationChargeUsd ?? ""
  );
  const [specialHandlingChargeUsd, setSpecialHandlingChargeUsd] = useState(
    latestPricing?.specialHandlingChargeUsd ?? ""
  );
  const [deliveryChargeUsd, setDeliveryChargeUsd] = useState(
    latestPricing?.deliveryChargeUsd ?? ""
  );
  const [otherChargeDescription, setOtherChargeDescription] = useState(
    latestPricing?.otherChargeDescription ?? ""
  );
  const [otherChargeUsd, setOtherChargeUsd] = useState(
    latestPricing?.otherChargeUsd ?? ""
  );

  const [isSaving, setIsSaving] = useState(false);
  const [isApproving, setIsApproving] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  const isApproved = pricingStatus === "APPROVED";
  const activeShippingRate = shippingRate;
  const structuredPricingAvailable = Boolean(activeShippingRate);
  const structuredPricingBasis = activeShippingRate?.pricingBasis ?? null;

  useEffect(() => {
    if (isApproved || !structuredPricingAvailable) {
      return;
    }

    if (!structuredPricingBasis) {
      return;
    }

    if (
      pricingBasis !== "MANUAL" &&
      pricingBasis !== structuredPricingBasis
    ) {
      setPricingBasis(structuredPricingBasis);
    }
  }, [
    isApproved,
    pricingBasis,
    structuredPricingAvailable,
    structuredPricingBasis,
  ]);

  const preview = useMemo(() => {
    const exchangeRate = Number(exchangeRateToGhs || 0);
    const extraChargesUsd =
      Number(handlingChargeUsd || 0) +
      Number(documentationChargeUsd || 0) +
      Number(specialHandlingChargeUsd || 0) +
      Number(deliveryChargeUsd || 0) +
      Number(otherChargeUsd || 0);

    if (pricingBasis === "MANUAL") {
      const baseUsd = Number(manualChargeUsd || 0);

      if (baseUsd <= 0) {
        return null;
      }

      const totalUsd = baseUsd + extraChargesUsd;

      return {
        quantity: 1,
        usd: totalUsd,
        ghs: totalUsd * exchangeRate,
      };
    }

    if (!activeShippingRate) {
      return null;
    }

    if (pricingBasis !== activeShippingRate.pricingBasis) {
      return null;
    }

    const quantity =
      pricingBasis === "KG"
        ? Number(chargeableWeightKg || 0)
        : Number(chargeableCbm || 0);
    const rate = Number(activeShippingRate.rateUsd || 0);

    if (quantity <= 0 || rate <= 0) {
      return null;
    }

    const baseUsd = quantity * rate;
    const totalUsd = baseUsd + extraChargesUsd;

    return {
      quantity,
      usd: totalUsd,
      ghs: totalUsd * exchangeRate,
    };
  }, [
    activeShippingRate,
    chargeableCbm,
    chargeableWeightKg,
    pricingBasis,
    manualChargeUsd,
    exchangeRateToGhs,
    handlingChargeUsd,
    documentationChargeUsd,
    specialHandlingChargeUsd,
    deliveryChargeUsd,
    otherChargeUsd,
  ]);

  const hasRequiredPricingInput =
    pricingBasis === "MANUAL"
      ? Number(manualChargeUsd || 0) > 0
      : Boolean(activeShippingRate) &&
        pricingBasis === activeShippingRate?.pricingBasis &&
        (pricingBasis === "KG"
          ? Number(chargeableWeightKg || 0) > 0
          : Number(chargeableCbm || 0) > 0);

  const hasValidExchangeRate = Number(exchangeRateToGhs) > 0;

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
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
            manualChargeUsd,
            handlingChargeUsd,
            documentationChargeUsd,
            specialHandlingChargeUsd,
            deliveryChargeUsd,
            otherChargeDescription,
            otherChargeUsd,
            exchangeRateToGhs,
            notes,
          }),
        }
      );

      const result = await response.json();

      if (!response.ok) {
        setError(result.message ?? "Unable to save pricing.");
        return;
      }

      setPricingId(result.pricing.id);
      setPricingStatus("DRAFT");
      setMessage("Shipment pricing saved.");
    } catch (submissionError) {
      console.error(submissionError);

      setError("Unable to save shipment pricing.");
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
        setError(result.message ?? "Unable to approve pricing.");
        return;
      }

      setPricingStatus("APPROVED");
      setMessage("Shipment pricing approved.");
    } catch (approvalError) {
      console.error("Failed to approve shipment pricing:", approvalError);

      setError("Unable to approve shipment pricing.");
    } finally {
      setIsApproving(false);
    }
  }

  return (
    <form className={styles.section} onSubmit={handleSubmit}>
      <div className={styles.summaryBox}>
        <h3>Shipment Pricing Summary</h3>

        <p>
          Shipping Mode:
          <strong>{shippingMode}</strong>
        </p>

        <p>
          Service Type:
          <strong>{serviceType}</strong>
        </p>

        <p>
          Goods Category:
          <strong>{goodsCategory}</strong>
        </p>

        <p>
          Active Rate:
          <strong>
            {activeShippingRate
              ? `${activeShippingRate.pricingBasis} ${activeShippingRate.rateUsd} ${activeShippingRate.unit}`
              : "No active rate"}
          </strong>
        </p>

        <p>
          Weight:
          <strong>{weightKg || "0"} kg</strong>
        </p>

        <p>
          Chargeable Weight:
          <strong>{chargeableWeightKg || "0"} kg</strong>
        </p>

        <p>
          Actual CBM:
          <strong>{actualCbm || "0"}</strong>
        </p>

        <p>
          Chargeable CBM:
          <strong>{chargeableCbm || "0"}</strong>
        </p>
      </div>

      <h2>Financial Calculation</h2>

      <div className={styles.grid}>
        <div>
          <label htmlFor="pricingBasis">Pricing Basis</label>

          <select
            id="pricingBasis"
            value={pricingBasis}
            disabled={isApproved}
            onChange={(event) =>
              setPricingBasis(event.target.value as PricingBasis)
            }
          >
            {structuredPricingAvailable ? (
              <>
                <option value={activeShippingRate!.pricingBasis}>
                  Matched rate ({activeShippingRate!.pricingBasis})
                </option>
                <option
                  value={
                    activeShippingRate!.pricingBasis === "KG"
                      ? "CBM"
                      : "KG"
                  }
                  disabled
                >
                  {activeShippingRate!.pricingBasis === "KG"
                    ? "CBM not available for this shipment"
                    : "KG not available for this shipment"}
                </option>
                <option value="MANUAL">Manual / Special</option>
              </>
            ) : (
              <>
                <option value="MANUAL">Manual / Special</option>
                <option value="KG" disabled>
                  KG unavailable until an active rate exists
                </option>
                <option value="CBM" disabled>
                  CBM unavailable until an active rate exists
                </option>
              </>
            )}
          </select>
        </div>

        <div>
          <span>Matched Rate</span>
          <strong>
            {activeShippingRate
              ? `${activeShippingRate.rateUsd} ${activeShippingRate.unit}`
              : rateError
                ? "Rate unavailable"
                : "No active rate"}
          </strong>
        </div>
      </div>

      {pricingBasis === "CBM" && (
        <div className={styles.grid}>
          <div>
            <span>Chargeable CBM</span>
            <strong>{chargeableCbm || "Not provided"}</strong>
          </div>
        </div>
      )}

      {pricingBasis === "KG" && (
        <div className={styles.grid}>
          <div>
            <span>Chargeable Weight</span>
            <strong>{chargeableWeightKg || "Not provided"}</strong>
          </div>
        </div>
      )}

      {pricingBasis === "MANUAL" && (
        <div>
          <label htmlFor="manualChargeUsd">Manual Charge (USD)</label>

          <input
            id="manualChargeUsd"
            type="number"
            min="0"
            step="0.01"
            value={manualChargeUsd}
            disabled={isApproved}
            onChange={(event) => setManualChargeUsd(event.target.value)}
          />
        </div>
      )}

      <div className={styles.grid}>
        <div />

        <div>
          <label htmlFor="handlingChargeUsd">Handling Charge (USD)</label>
          <input
            id="handlingChargeUsd"
            type="number"
            min="0"
            step="0.01"
            value={handlingChargeUsd}
            disabled={isApproved}
            onChange={(event) => setHandlingChargeUsd(event.target.value)}
          />
        </div>

        <div>
          <label htmlFor="documentationChargeUsd">
            Documentation Charge (USD)
          </label>
          <input
            id="documentationChargeUsd"
            type="number"
            min="0"
            step="0.01"
            value={documentationChargeUsd}
            disabled={isApproved}
            onChange={(event) =>
              setDocumentationChargeUsd(event.target.value)
            }
          />
        </div>

        <div>
          <label htmlFor="specialHandlingChargeUsd">
            Special Handling (USD)
          </label>
          <input
            id="specialHandlingChargeUsd"
            type="number"
            min="0"
            step="0.01"
            value={specialHandlingChargeUsd}
            disabled={isApproved}
            onChange={(event) =>
              setSpecialHandlingChargeUsd(event.target.value)
            }
          />
        </div>

        <div>
          <label htmlFor="deliveryChargeUsd">Delivery Charge (USD)</label>
          <input
            id="deliveryChargeUsd"
            type="number"
            min="0"
            step="0.01"
            value={deliveryChargeUsd}
            disabled={isApproved}
            onChange={(event) => setDeliveryChargeUsd(event.target.value)}
          />
        </div>

        <div>
          <label htmlFor="otherChargeDescription">
            Other Charge Description
          </label>
          <input
            id="otherChargeDescription"
            type="text"
            value={otherChargeDescription}
            disabled={isApproved}
            onChange={(event) =>
              setOtherChargeDescription(event.target.value)
            }
          />
        </div>

        <div>
          <label htmlFor="otherChargeUsd">Other Charge (USD)</label>
          <input
            id="otherChargeUsd"
            type="number"
            min="0"
            step="0.01"
            value={otherChargeUsd}
            disabled={isApproved}
            onChange={(event) => setOtherChargeUsd(event.target.value)}
          />
        </div>
      </div>

      <div className={styles.grid}>
        <div>
          <label htmlFor="exchangeRate">USD → GHS Exchange Rate</label>

          <input
            id="exchangeRate"
            type="number"
            min="0.000001"
            step="0.000001"
            value={exchangeRateToGhs}
            disabled={isApproved}
            onChange={(event) =>
              setExchangeRateToGhs(event.target.value)
            }
          />
        </div>

        <div>
          <label htmlFor="notes">Pricing Notes</label>

          <input
            id="notes"
            type="text"
            value={notes}
            disabled={isApproved}
            onChange={(event) => setNotes(event.target.value)}
          />
        </div>
      </div>

      <div className={styles.totalBox}>
        <span>Preview Customer Charge</span>

        {preview ? (
          <>
            <strong>${preview.usd.toFixed(2)} USD</strong>

            <small>GHS {preview.ghs.toFixed(2)}</small>
          </>
        ) : (
          <small>
            Enter the required pricing quantity and rate to calculate the
            customer charge.
          </small>
        )}
      </div>

      {message && <p className={styles.success}>{message}</p>}

      {error && <p className={styles.error}>{error}</p>}

      {rateError && (
        <p className={styles.error}>{rateError}</p>
      )}

      <div className={styles.actions}>
        {!isApproved && (
          <button
            type="submit"
            disabled={
              isSaving ||
              isApproving ||
              !hasRequiredPricingInput ||
              !hasValidExchangeRate ||
              !preview
            }
          >
            {isSaving ? "Saving..." : "Save Draft Pricing"}
          </button>
        )}

        {pricingStatus === "DRAFT" && pricingId && (
          <button
            type="button"
            onClick={handleApprovePricing}
            disabled={isSaving || isApproving}
            className={styles.approveButton}
          >
            {isApproving ? "Approving..." : "Approve Pricing"}
          </button>
        )}

        {isApproved && <div className={styles.approvedBadge}>Approved</div>}
      </div>
    </form>
  );
}
