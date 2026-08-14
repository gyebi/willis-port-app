"use client";

import { useMemo, useState } from "react";
import styles from "./page.module.css";

type PricingBasis = "CBM" | "WEIGHT" | "MANUAL";

type PricingSectionProps = {
  volumeCbm: string | null;
  weightKg: string | null;
};

export default function PricingSection({
  volumeCbm,
  weightKg,
}: PricingSectionProps) {
  const [pricingBasis, setPricingBasis] =
    useState<PricingBasis>("CBM");

  const [rate, setRate] = useState("0");
  const [handlingCharge, setHandlingCharge] = useState("0");
  const [documentationCharge, setDocumentationCharge] =
    useState("0");
  const [specialHandlingCharge, setSpecialHandlingCharge] =
    useState("0");
  const [discount, setDiscount] = useState("0");

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

      <div className={styles.description}>
        <span>Calculated Subtotal</span>
        <p>
          <strong>${subtotal.toFixed(2)} USD</strong>
        </p>
      </div>
    </section>
  );
}
