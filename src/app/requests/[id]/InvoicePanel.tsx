import styles from "./page.module.css";
import GenerateInvoiceButton from "./GenerateInvoiceButton";
import InvoiceHeader from "./invoice/InvoiceHeader";
import CustomerSummary from "./invoice/CustomerSummary";
import ShipmentSummary from "./invoice/ShipmentSummary";
import InvoiceActions from "./invoice/InvoiceActions";

type InvoicePanelProps = {
  requestId: string;
  customerName: string;
  phone: string;
  email: string | null;
  requestSource: string;
  shippingMethod: string;
  goodsCategory: string;
  weightKg: string | null;
  volumeCbm: string | null;
  goodsDescription: string;
  invoice: {
    invoiceNumber: string;
    status: string;
    currency: string;
    exchangeRate: {
      toString(): string;
    };
    subtotalUsd: {
      toString(): string;
    };
    totalGhs: {
      toString(): string;
    };
    validUntil: Date;
  } | null;
};

export default function InvoicePanel({
  requestId,
  customerName,
  phone,
  email,
  requestSource,
  shippingMethod,
  goodsCategory,
  weightKg,
  volumeCbm,
  goodsDescription,
  invoice,
}: InvoicePanelProps) {
  return (
    <section className={styles.section}>
      <h2>Invoice</h2>

      {invoice ? (
        <>
          <InvoiceHeader
            invoiceNumber={invoice.invoiceNumber}
            status={invoice.status}
          />
          <CustomerSummary
            customerName={customerName}
            phone={phone}
            email={email}
            requestSource={requestSource}
          />
          <ShipmentSummary
            shippingMethod={shippingMethod}
            goodsCategory={goodsCategory}
            weightKg={weightKg}
            volumeCbm={volumeCbm}
            goodsDescription={goodsDescription}
          />
          <InvoiceActions
            customerPhone={phone}
            customerEmail={email}
          />
        </>
      ) : (
        <div className={styles.emptyInvoiceState}>
          <p>No invoice has been generated for this request yet.</p>
        </div>
      )}

      <div className={styles.actions}>
        <GenerateInvoiceButton
          requestId={requestId}
          hasInvoice={Boolean(invoice)}
        />
      </div>
    </section>
  );
}
