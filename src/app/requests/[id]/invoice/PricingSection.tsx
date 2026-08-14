"use client";

import { useMemo, useState } from "react";
import styles from "./page.module.css";

type PricingBasis = "CBM" | "WEIGHT" | "MANUAL";

type PricingSectionProps = {
  requestId: string;
  volumeCbm: string | null;
  weightKg: string | null;

  initialPricingBasis: "CBM" | "WEIGHT" | "MANUAL";
  initialRateUsd: string;
  initialHandlingChargeUsd: string;
  initialDocumentationChargeUsd: string;
  initialSpecialHandlingChargeUsd: string;
  initialDiscountUsd: string;
  initialExchangeRate: string;
  initialValidUntil: string;
};

export default function PricingSection({
  requestId,
  volumeCbm,
  weightKg,
  initialPricingBasis,
  initialRateUsd,
  initialHandlingChargeUsd,
  initialDocumentationChargeUsd,
  initialSpecialHandlingChargeUsd,
  initialDiscountUsd,
  initialExchangeRate,
  initialValidUntil,
}: PricingSectionProps) {
  const [pricingBasis, setPricingBasis] =
    useState<PricingBasis>(initialPricingBasis);

  const [rate, setRate] = useState(initialRateUsd);

  const [handlingCharge, setHandlingCharge] =
    useState(initialHandlingChargeUsd);

  const [documentationCharge, setDocumentationCharge] =
    useState(initialDocumentationChargeUsd);

  const [specialHandlingCharge, setSpecialHandlingCharge] =
    useState(initialSpecialHandlingChargeUsd);

  const [discount, setDiscount] =
    useState(initialDiscountUsd);

  const [exchangeRate, setExchangeRate] =
    useState(initialExchangeRate);

  const [validUntil, setValidUntil] =
    useState(initialValidUntil);

  const [isSaving, setIsSaving] = useState(false);
  const [saveMessage, setSaveMessage] = useState("");
  const [saveError, setSaveError] = useState("");

  const quantity = useMemo(() => {
    if (pricingBasis === "CBM") {
      return Number(volumeCbm ?? 0);
    }

    if (pricingBasis === "WEIGHT") {
      return Number(weightKg ?? 0);
    }

    return 1;
  }, [pricingBasis, volumeCbm, weightKg]);

  const shippingCharge = useMemo(() => {
    return quantity * Number(rate || 0);
  }, [quantity, rate]);

  const subtotal = useMemo(() => {
    return (
      shippingCharge +
      Number(handlingCharge || 0) +
      Number(documentationCharge || 0) +
      Number(specialHandlingCharge || 0) -
      Number(discount || 0)
    );
  }, [
    shippingCharge,
    handlingCharge,
    documentationCharge,
    specialHandlingCharge,
    discount,
  ]);

  async function handleSaveDraft() {
    try {
      setIsSaving(true);
      setSaveMessage("");
      setSaveError("");

      const response = await fetch(
        `/api/requests/${requestId}/invoice`,
        {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            pricingBasis,
            rateUsd: rate,
            handlingChargeUsd: handlingCharge,
            documentationChargeUsd: documentationCharge,
            specialHandlingChargeUsd: specialHandlingCharge,
            discountUsd: discount,
            exchangeRate,
            validUntil,
          }),
        }
      );

      const result = await response.json();

      if (!response.ok) {
        setSaveError(
          result.message ?? "Unable to save invoice draft."
        );
        return;
      }

      setSaveMessage("Invoice draft saved.");
    } catch (error) {
      console.error("Failed to save invoice draft:", error);

      setSaveError(
        "Unable to save invoice draft. Please try again."
      );
    } finally {
      setIsSaving(false);
    }
  }
  return (
    <section className={styles.section}>
      <h2>Pricing</h2>

      <div className={styles.grid}>
        <div>
          <label htmlFor="pricingBasis">Pricing Basis</label>

          <select
            id="pricingBasis"
            value={pricingBasis}
            onChange={(event) =>
              setPricingBasis(
                event.target.value as PricingBasis
              )
            }
          >
            <option value="CBM">CBM</option>
            <option value="WEIGHT">Weight</option>
            <option value="MANUAL">Manual / Special Rate</option>
          </select>
        </div>

        <div className={styles.grid}>
          <div>
            <label htmlFor="exchangeRate">
              USD to GHS Exchange Rate
            </label>

            <input
              id="exchangeRate"
              type="number"
              min="0.000001"
              step="0.000001"
              value={exchangeRate}
              onChange={(event) =>
                setExchangeRate(event.target.value)
              }
            />
          </div>

          <div>
            <label htmlFor="validUntil">
              Valid Until
            </label>

            <input
              id="validUntil"
              type="date"
              value={validUntil}
              onChange={(event) =>
                setValidUntil(event.target.value)
              }
            />
          </div>
        </div>

        <div>
          <span>Quantity</span>

          <strong>
            {pricingBasis === "CBM" && `${quantity} CBM`}

            {pricingBasis === "WEIGHT" && `${quantity} kg`}

            {pricingBasis === "MANUAL" && "Manual"}
          </strong>
        </div>

        <div>
          <label htmlFor="rate">Rate (USD)</label>

          <input
            id="rate"
            type="number"
            min="0"
            step="0.01"
            value={rate}
            onChange={(event) =>
              setRate(event.target.value)
            }
          />
        </div>

        <div>
          <span>Shipping Charge</span>
          <strong>${shippingCharge.toFixed(2)}</strong>
        </div>
      </div>

      <div className={styles.grid}>
        <div>
          <label htmlFor="handlingCharge">
            Handling Charge
          </label>

          <input
            id="handlingCharge"
            type="number"
            min="0"
            step="0.01"
            value={handlingCharge}
            onChange={(event) =>
              setHandlingCharge(event.target.value)
            }
          />
        </div>

        <div>
          <label htmlFor="documentationCharge">
            Documentation Charge
          </label>

          <input
            id="documentationCharge"
            type="number"
            min="0"
            step="0.01"
            value={documentationCharge}
            onChange={(event) =>
              setDocumentationCharge(event.target.value)
            }
          />
        </div>

        <div>
          <label htmlFor="specialHandlingCharge">
            Special Handling
          </label>

          <input
            id="specialHandlingCharge"
            type="number"
            min="0"
            step="0.01"
            value={specialHandlingCharge}
            onChange={(event) =>
              setSpecialHandlingCharge(event.target.value)
            }
          />
        </div>

        <div>
          <label htmlFor="discount">Discount</label>

          <input
            id="discount"
            type="number"
            min="0"
            step="0.01"
            value={discount}
            onChange={(event) =>
              setDiscount(event.target.value)
            }
          />
        </div>
      </div>

      <div className={styles.totalBox}>
        <span>Calculated Subtotal</span>
        <strong>${subtotal.toFixed(2)} USD</strong>
      </div>
<div className={styles.actions}>
  <button
    type="button"
    onClick={handleSaveDraft}
    disabled={isSaving}
  >
    {isSaving ? "Saving..." : "Save Draft"}
  </button>
</div>

{saveMessage && (
  <p className={styles.success}>
    {saveMessage}
  </p>
)}

{saveError && (
  <p className={styles.warning}>
    {saveError}
  </p>
)}
    </section>
  );
}
