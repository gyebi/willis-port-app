"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import styles from "./page.module.css";

type GenerateInvoiceButtonProps = {
  requestId: string;
  hasInvoice: boolean;
};

export default function GenerateInvoiceButton({
  requestId,
  hasInvoice,
}: GenerateInvoiceButtonProps) {
  const router = useRouter();

  const [isCreating, setIsCreating] = useState(false);
  const [message, setMessage] = useState("");

  async function handleGenerateInvoice() {
    if (isCreating || hasInvoice) {
      return;
    }

    setMessage("");
    setIsCreating(true);

    try {
      const response = await fetch(
        `/api/requests/${requestId}/invoice`,
        {
          method: "POST",
        }
      );

      const result = await response.json();

      if (!response.ok) {
        setMessage(
          result.message ?? "Unable to create invoice."
        );
        return;
      }

      setMessage("Invoice created successfully.");

      router.refresh();
    } catch {
      setMessage("Unable to create invoice.");
    } finally {
      setIsCreating(false);
    }
  }

  return (
    <div>
      <button
        type="button"
        className={styles.invoiceButton}
        onClick={handleGenerateInvoice}
        disabled={isCreating || hasInvoice}
      >
        {hasInvoice
          ? "Invoice Created"
          : isCreating
            ? "Creating..."
            : "Generate Invoice"}
      </button>

      {message && (
        <p className={styles.actionMessage}>
          {message}
        </p>
      )}
    </div>
  );
}