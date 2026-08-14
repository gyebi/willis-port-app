import styles from "./page.module.css";

type InvoiceHeaderProps = {
  invoiceNumber: string;
  status: string;
};

export default function InvoiceHeader({
  invoiceNumber,
  status,
}: InvoiceHeaderProps) {
  return (
    <header className={styles.header}>
      <div>
        <p className={styles.eyebrow}>WILLIS PORT</p>

        <h1>Invoice {invoiceNumber}</h1>

        <p className={styles.subtitle}>Invoice workspace</p>
      </div>

      <span className={styles.status}>
        {status.replaceAll("_", " ")}
      </span>
    </header>
  );
}
