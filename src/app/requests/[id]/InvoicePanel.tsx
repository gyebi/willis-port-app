import Link from "next/link";
import styles from "./page.module.css";

type InvoicePanelProps = {
  customerId: string | null;
  shipmentId: string | null;
};

export default function InvoicePanel({
  customerId,
  shipmentId,
}: InvoicePanelProps) {
  return (
    <section className={styles.section}>
      <h2>Next Step</h2>
      <p>
        Pricing and invoicing are managed from the shipment record.
      </p>

      <div className={styles.actions}>
        {shipmentId ? (

          <Link
            href={`/shipments/${shipmentId}`}
            className={styles.invoiceButton}
          >
            Open Shipment
          </Link>
        ) : customerId ? (
          <Link
            href={`/customers/${customerId}`}
            className={styles.invoiceButton}
          >
            Open Customer
          </Link>
        ) : (
          <p>
            This request is not yet linked to a customer or shipment.
          </p>
        )}
      </div>
    </section>
  );
}
