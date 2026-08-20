"use client";

import {
  FormEvent,
  useEffect,
  useMemo,
  useState,
} from "react";

import styles from "./page.module.css";

type PricingBasis = "CBM" | "KG" | "MANUAL";

type PricingFormProps = {
  shipmentId: string;
  shippingMode: string;
  serviceType: string;
  goodsCategory: string;
  weightKg: string;
  chargeableWeightKg: string;
  actualCbm: string;
  chargeableCbm: string;

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
}

export default function PricingForm({
  shipmentId,
  shippingMode,
  serviceType,
  goodsCategory,
  weightKg,
  chargeableWeightKg,
  actualCbm,
  chargeableCbm,
  latestPricing,
}: PricingFormProps) {
  const [pricingBasis, setPricingBasis] =
    useState<PricingBasis | null>(
      latestPricing?.pricingBasis ?? null
    );

  const [chargeableWeightKg, setChargeableWeightKg] =
    useState(
      latestPricing?.chargeableWeightKg || weightKg
    );

  

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

  const [approvedRateUsd, setApprovedRateUsd] =
    useState(latestPricing?.unitRateUsd ?? "");

  const [approvedRateUnit, setApprovedRateUnit] =
    useState("");

  const [rateError, setRateError] =
    useState("");

  const [pricingStatus, setPricingStatus] = useState<
    "DRAFT" | "APPROVED" | "SUPERSEDED" | null
  >(latestPricing?.status ?? null);



  const [handlingChargeUsd, setHandlingChargeUsd] =
    useState(
      latestPricing?.handlingChargeUsd ?? ""
    );

  const [documentationChargeUsd, setDocumentationChargeUsd] =
    useState(
      latestPricing?.documentationChargeUsd ?? ""
    );

  const [specialHandlingChargeUsd, setSpecialHandlingChargeUsd] =
    useState(
      latestPricing?.specialHandlingChargeUsd ?? ""
    );

  const [deliveryChargeUsd, setDeliveryChargeUsd] =
    useState(
      latestPricing?.deliveryChargeUsd ?? ""
    );

  const [otherChargeDescription, setOtherChargeDescription] =
    useState(
      latestPricing?.otherChargeDescription ?? ""
    );

  const [otherChargeUsd, setOtherChargeUsd] =
    useState(
      latestPricing?.otherChargeUsd ?? ""
    );

  const [isSaving, setIsSaving] = useState(false);
  const [isApproving, setIsApproving] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  const isApproved = pricingStatus === "APPROVED";

  const hasRequiredPricingInput =
    pricingBasis === "CBM"
      ? Number(chargeableCbm || 0) > 0
      : pricingBasis === "KG"
        ? Number(chargeableWeightKg || 0) > 0
        : Number(manualChargeUsd || 0) > 0;

  const hasValidExchangeRate =
    Number(exchangeRateToGhs) > 0;

  useEffect(() => {
    let cancelled = false;

    async function loadShippingRate() {
      setRateError("");

      try {
        const params = new URLSearchParams({
          shippingMode,
          serviceType,
          goodsCategory,
        });

        const response = await fetch(
          `/api/shipping-rates?${params.toString()}`
        );

        const result = await response.json();

        if (!response.ok) {
          if (!cancelled) {
            setRateError(
              result.message ??
              "Unable to load shipping rate."
            );
          }
          return;
        }

        if (!cancelled) {
          setApprovedRateUsd(result.rateUsd);
          setApprovedRateUnit(result.unit);

          if (!latestPricing) {
            setPricingBasis(result.pricingBasis);
          }
        }
      } catch (error) {
        console.error(error);

        if (!cancelled) {
          setRateError(
            "Unable to load shipping rate."
          );
        }
      }
    }


      loadShippingRate();

      return () => {
        cancelled = true;
      };
    }, [
      shippingMode,
      serviceType,
      goodsCategory,
      latestPricing,
    ]);

  const preview = useMemo(() => {
    const exchangeRate = Number(exchangeRateToGhs || 0);

    const extraChargesUsd =

      Number(handlingChargeUsd || 0) +
      Number(documentationChargeUsd || 0) +
      Number(specialHandlingChargeUsd || 0) +
      Number(deliveryChargeUsd || 0) +
      Number(otherChargeUsd || 0);

    if (pricingBasis === "CBM") {
      const quantity = Number(chargeableCbm || 0);
      const rate = Number(approvedRateUsd || 0);

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
    }

    if (pricingBasis === "KG") {
      const quantity = Number(chargeableWeightKg || 0);
      const rate = Number(approvedRateUsd || 0);


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
    }

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
  }, [
    pricingBasis,
    chargeableCbm,
    chargeableWeightKg,
    approvedRateUsd,
    manualChargeUsd,
    exchangeRateToGhs,
    handlingChargeUsd,
    documentationChargeUsd,
    specialHandlingChargeUsd,
    deliveryChargeUsd,
    otherChargeUsd,
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
      <div className={styles.summaryBox}>
        <h3>Shipment Pricing Summary</h3>

        <p>
          Actual Weight:
          <strong>
            {weightKg || "0"} kg
          </strong>
        </p>

        <p>
          Actual CBM:
          <strong>
            {actualCbm || "0"}
          </strong>
        </p>

        <p>
          Chargeable CBM:
          <strong>
            {chargeableCbm || "0"}
          </strong>
        </p>
      </div>
      <h2>Financial Calculation</h2>

      <div className={styles.grid}>
        <div>
          <label htmlFor="pricingBasis">
            Pricing Basis
          </label>

          <select
            id="pricingBasis"
            value={pricingBasis ?? ""} disabled={isApproved}
            onChange={(event) =>
              setPricingBasis(
                event.target.value as PricingBasis
              )
            }
          >

            <option value="" disabled>
              Loading pricing basis...
            </option>


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

            <div>
              <span>Approved Rate</span>
              <strong>
                {approvedRateUsd
                  ? `$${approvedRateUsd} ${approvedRateUnit}`
                  : "Loading rate..."}
              </strong>
            </div>
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
            <span>Approved Rate</span>
            <strong>
              {approvedRateUsd
                ? `$${approvedRateUsd} ${approvedRateUnit}`
                : rateError
                  ? "Rate unavailable"
                  : "Loading rate..."}
            </strong>
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

        </div>

        <div>
          <label htmlFor="handlingChargeUsd">
            Handling Charge (USD)
          </label>
          <input
            id="handlingChargeUsd"
            type="number"
            min="0"
            step="0.01"
            value={handlingChargeUsd}
            disabled={isApproved}
            onChange={(e) =>
              setHandlingChargeUsd(e.target.value)
            }
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
            onChange={(e) =>
              setDocumentationChargeUsd(
                e.target.value
              )
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
            onChange={(e) =>
              setSpecialHandlingChargeUsd(
                e.target.value
              )
            }
          />
        </div>

        <div>
          <label htmlFor="deliveryChargeUsd">
            Delivery Charge (USD)
          </label>
          <input
            id="deliveryChargeUsd"
            type="number"
            min="0"
            step="0.01"
            value={deliveryChargeUsd}
            disabled={isApproved}
            onChange={(e) =>
              setDeliveryChargeUsd(e.target.value)
            }
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
            onChange={(e) =>
              setOtherChargeDescription(
                e.target.value
              )
            }
          />
        </div>

        <div>
          <label htmlFor="otherChargeUsd">
            Other Charge (USD)
          </label>
          <input
            id="otherChargeUsd"
            type="number"
            min="0"
            step="0.01"
            value={otherChargeUsd}
            disabled={isApproved}
            onChange={(e) =>
              setOtherChargeUsd(e.target.value)
            }
          />
        </div>
      </div>

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

        {preview ? (
          <>
            <strong>
              ${preview.usd.toFixed(2)} USD
            </strong>

            <small>
              GHS {preview.ghs.toFixed(2)}
            </small>
          </>
        ) : (
          <small>
            Enter the required pricing quantity and rate to calculate the customer charge.
          </small>
        )}
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
            disabled={
              isSaving ||
              isApproving ||
              !hasRequiredPricingInput ||
              !hasValidExchangeRate ||
              !preview
            }
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

      {rateError && (
        <p className={styles.error}>
          {rateError}
        </p>
      )}
    </form>
  );
}
