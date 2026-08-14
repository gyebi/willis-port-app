import styles from "./page.module.css";

type ShipmentSummaryProps = {
  shippingMethod: string;
  goodsCategory: string;
  weightKg: string | null;
  volumeCbm: string | null;
  goodsDescription: string;
};

export default function ShipmentSummary({
  shippingMethod,
  goodsCategory,
  weightKg,
  volumeCbm,
  goodsDescription,
}: ShipmentSummaryProps) {
  return (
    <section className={styles.section}>
      <h2>Shipment</h2>

      <div className={styles.grid}>
        <div>
          <span>Shipping Method</span>
          <strong>{shippingMethod}</strong>
        </div>

        <div>
          <span>Goods Category</span>
          <strong>{goodsCategory}</strong>
        </div>

        <div>
          <span>Weight</span>
          <strong>
            {weightKg ? `${weightKg} kg` : "Not provided"}
          </strong>
        </div>

        <div>
          <span>Volume</span>
          <strong>
            {volumeCbm ? `${volumeCbm} CBM` : "Not provided"}
          </strong>
        </div>
      </div>

      <div className={styles.description}>
        <span>Description</span>
        <p>{goodsDescription}</p>
      </div>
    </section>
  );
}
