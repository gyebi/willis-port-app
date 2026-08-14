"use client";

import styles from "./page.module.css";

type InvoiceActionsProps = {
  requestId: string;
  customerPhone: string;
  customerEmail: string | null;
};

export default function InvoiceActions({
  requestId,
  customerPhone,
  customerEmail,
}: InvoiceActionsProps) {
  const pdfUrl = `/api/requests/${requestId}/invoice/pdf`;

  return (
    <section className={styles.section}>
      <h2>Send / Share</h2>

      <p className={styles.sectionText}>
        Review the invoice before sending it to the customer.
      </p>

      <div className={styles.actions}>
        <button
          type="button"
          onClick={() => window.open(pdfUrl, "_blank")}
        >
          Preview Invoice
        </button>

        <button
          type="button"
          onClick={() => window.open(pdfUrl, "_blank")}
        >
          PDF
        </button>

        <button type="button" disabled={!customerPhone}>
          WhatsApp
        </button>

        <button type="button" disabled={!customerPhone}>
          SMS / Text
        </button>

        <button type="button" disabled={!customerEmail}>
          Email
        </button>

        <button type="button">Print</button>
      </div>

      {!customerEmail && (
        <p className={styles.warning}>
          Email unavailable — this customer has no email address.
        </p>
      )}
    </section>
  );
}