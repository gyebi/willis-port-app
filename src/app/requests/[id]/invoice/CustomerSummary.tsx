import styles from "./page.module.css";

type CustomerSummaryProps = {
  customerName: string;
  phone: string;
  email: string | null;
  requestSource: string;
};

export default function CustomerSummary({
  customerName,
  phone,
  email,
  requestSource,
}: CustomerSummaryProps) {
  return (
    <section className={styles.section}>
      <h2>Customer</h2>

      <div className={styles.grid}>
        <div>
          <span>Name</span>
          <strong>{customerName}</strong>
        </div>

        <div>
          <span>Phone</span>
          <strong>{phone}</strong>
        </div>

        <div>
          <span>Email</span>
          <strong>{email || "Not provided"}</strong>
        </div>

        <div>
          <span>Request Source</span>
          <strong>{requestSource.replaceAll("_", " ")}</strong>
        </div>
      </div>
    </section>
  );
}
