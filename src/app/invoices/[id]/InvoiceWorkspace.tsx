"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";

import styles from "./InvoiceWorkspace.module.css";

type DeliveryChannel =
  | "EMAIL"
  | "WHATSAPP"
  | "SMS"
  | "MAIL"
  | "PRINT";

type PaymentMethod =
  | "CASH"
  | "BANK_TRANSFER"
  | "MOBILE_MONEY"
  | "CARD"
  | "OTHER";

type InvoiceWorkspaceProps = {
  invoiceId: string;
  invoiceNumber: string;
  status: string;
  validUntil: string;
  balanceGhs: string;
  customer: {
    id: string;
    name: string;
    phone: string | null;
    whatsapp: string | null;
    email: string | null;
    address: string | null;
  };
  invoiceDocument: {
    id: string;
    storagePath: string;
    generatedAt: string;
  } | null;
  deliveries: Array<{
    id: string;
    channel: DeliveryChannel;
    status: string;
    recipient: string | null;
    createdAt: string;
    sentAt: string | null;
    notes: string | null;
  }>;
  payments: Array<{
    id: string;
    amountGhs: string;
    method: PaymentMethod;
    reference: string | null;
    notes: string | null;
    paidAt: string;
  }>;
  shipments: Array<{
    id: string;
    shipmentNumber: string;
    trackingNumber: string | null;
    description: string | null;
    containerId: string | null;
    containerNumber: string | null;
    shippingMode: "SEA" | "AIR" | "UNKNOWN";
    serviceType: "STANDARD" | "EXPRESS";
    goodsCategory: "NORMAL" | "SPECIAL";
    goodsType: string | null;
    weightKg: string | null;
    chargeableWeightKg: string | null;
    declaredCbm: string | null;
    actualCbm: string | null;
    chargeableCbm: string | null;
    dateReceived: string | null;
  }>;
  containerOptions: Array<{
    id: string;
    containerNumber: string;
    status: string;
  }>;
};

const deliveryLabels: Record<DeliveryChannel, string> = {
  EMAIL: "Email",
  WHATSAPP: "WhatsApp",
  SMS: "SMS",
  MAIL: "Mail",
  PRINT: "Print",
};

const paymentLabels: Record<PaymentMethod, string> = {
  CASH: "Cash",
  BANK_TRANSFER: "Bank Transfer",
  MOBILE_MONEY: "Mobile Money",
  CARD: "Card",
  OTHER: "Other",
};

export default function InvoiceWorkspace({
  invoiceId,
  invoiceNumber,
  status,
  validUntil,
  balanceGhs,
  customer,
  invoiceDocument,
  deliveries,
  payments,
  shipments,
  containerOptions,
}: InvoiceWorkspaceProps) {
  const router = useRouter();

  const [editingCustomer, setEditingCustomer] = useState(false);
  const [editingShipmentId, setEditingShipmentId] = useState<string | null>(null);
  const [paymentAmount, setPaymentAmount] = useState(balanceGhs);
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>("CASH");
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [issuingChannel, setIssuingChannel] = useState<DeliveryChannel | null>(null);
  const [isSavingCustomer, setIsSavingCustomer] = useState(false);
  const [savingShipmentId, setSavingShipmentId] = useState<string | null>(null);
  const [isRecordingPayment, setIsRecordingPayment] = useState(false);

  async function handleCustomerSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    setError("");
    setMessage("");
    setIsSavingCustomer(true);

    const form = new FormData(event.currentTarget);

    try {
      const response = await fetch(`/api/customers/${customer.id}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          name: form.get("name"),
          phone: form.get("phone"),
          whatsapp: form.get("whatsapp"),
          email: form.get("email"),
          address: form.get("address"),
        }),
      });

      const result = await response.json();

      if (!response.ok) {
        setError(result.message ?? "Unable to update customer.");
        return;
      }

      setMessage("Customer details updated.");
      setEditingCustomer(false);
      router.refresh();
    } catch (submitError) {
      console.error("Failed to update customer:", submitError);
      setError("Unable to update customer.");
    } finally {
      setIsSavingCustomer(false);
    }
  }

  async function handleShipmentSubmit(
    event: FormEvent<HTMLFormElement>,
    shipmentId: string
  ) {
    event.preventDefault();

    setError("");
    setMessage("");
    setSavingShipmentId(shipmentId);

    const form = new FormData(event.currentTarget);

    try {
      const response = await fetch(`/api/shipments/${shipmentId}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          trackingNumber: form.get("trackingNumber"),
          containerId: form.get("containerId"),
          description: form.get("description"),
          shippingMode: form.get("shippingMode"),
          serviceType: form.get("serviceType"),
          goodsCategory: form.get("goodsCategory"),
          goodsType: form.get("goodsType"),
          weightKg: form.get("weightKg"),
          chargeableWeightKg: form.get("chargeableWeightKg"),
          declaredCbm: form.get("declaredCbm"),
          actualCbm: form.get("actualCbm"),
          chargeableCbm: form.get("chargeableCbm"),
          dateReceived: form.get("dateReceived"),
        }),
      });

      const result = await response.json();

      if (!response.ok) {
        setError(result.message ?? "Unable to update shipment.");
        return;
      }

      setMessage("Shipment details updated.");
      setEditingShipmentId(null);
      router.refresh();
    } catch (submitError) {
      console.error("Failed to update shipment:", submitError);
      setError("Unable to update shipment.");
    } finally {
      setSavingShipmentId(null);
    }
  }

  async function handleIssue(channel: DeliveryChannel) {
    setError("");
    setMessage("");
    setIssuingChannel(channel);

    try {
      const response = await fetch(`/api/invoices/${invoiceId}/deliver`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          channel,
        }),
      });

      const result = await response.json();

      if (!response.ok) {
        setError(result.message ?? "Unable to issue invoice.");
        return;
      }

      setMessage(
        `Invoice issued via ${deliveryLabels[channel]}.`
      );
      router.refresh();
    } catch (submitError) {
      console.error("Failed to issue invoice:", submitError);
      setError("Unable to issue invoice.");
    } finally {
      setIssuingChannel(null);
    }
  }

  async function handlePaymentSubmit(
    event: FormEvent<HTMLFormElement>
  ) {
    event.preventDefault();

    setError("");
    setMessage("");
    setIsRecordingPayment(true);

    const form = new FormData(event.currentTarget);

    try {
      const response = await fetch(`/api/invoices/${invoiceId}/payments`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          amountGhs: form.get("amountGhs"),
          method: form.get("method"),
          reference: form.get("reference"),
          notes: form.get("notes"),
        }),
      });

      const result = await response.json();

      if (!response.ok) {
        setError(result.message ?? "Unable to record payment.");
        return;
      }

      setMessage(
        result.message ?? "Payment recorded."
      );
      setPaymentAmount(result.balanceGhs ?? balanceGhs);
      setPaymentMethod("CASH");
      router.refresh();
    } catch (submitError) {
      console.error("Failed to record payment:", submitError);
      setError("Unable to record payment.");
    } finally {
      setIsRecordingPayment(false);
    }
  }

  const latestPayment = payments[0] ?? null;

  return (
    <div className={styles.workspace}>
      {message ? <p className={styles.message}>{message}</p> : null}
      {error ? <p className={styles.error}>{error}</p> : null}

      <section className={styles.section}>
        <div className={styles.sectionHeader}>
          <div>
            <h2>Invoice Status</h2>
            <p>
              {status.replaceAll("_", " ")} until {validUntil}
            </p>
          </div>

          <div className={styles.inlineActions}>
            <a
              href={`/api/invoices/${invoiceId}/pdf`}
              target="_blank"
              rel="noreferrer"
              className={styles.secondaryButton}
            >
              Preview PDF
            </a>

            {invoiceDocument ? (
              <span className={styles.issueBadge}>Issued PDF saved</span>
            ) : (
              <span className={styles.issueBadgeMuted}>No issued PDF</span>
            )}
          </div>
        </div>

        <div className={styles.summaryGrid}>
          <div>
            <span>Invoice #</span>
            <strong>{invoiceNumber}</strong>
          </div>

          <div>
            <span>Customer</span>
            <strong>{customer.name}</strong>
          </div>

          <div>
            <span>Outstanding Balance</span>
            <strong>GHS {balanceGhs}</strong>
          </div>

          <div>
            <span>Latest Payment</span>
            <strong>
              {latestPayment
                ? `GHS ${latestPayment.amountGhs}`
                : "None recorded"}
            </strong>
          </div>
        </div>
      </section>

      <section className={styles.section}>
        <div className={styles.sectionHeader}>
          <div>
            <h2>Customer</h2>
            <p>Correct contact details before issuing the invoice.</p>
          </div>

          <button
            type="button"
            className={styles.editButton}
            onClick={() => setEditingCustomer((current) => !current)}
          >
            {editingCustomer ? "Close" : "Edit"}
          </button>
        </div>

        <div className={styles.infoGrid}>
          <div>
            <span>Name</span>
            <strong>{customer.name}</strong>
          </div>

          <div>
            <span>Phone</span>
            <strong>{customer.phone ?? "Not provided"}</strong>
          </div>

          <div>
            <span>WhatsApp</span>
            <strong>{customer.whatsapp ?? "Not provided"}</strong>
          </div>

          <div>
            <span>Email</span>
            <strong>{customer.email ?? "Not provided"}</strong>
          </div>

          <div className={styles.fullWidth}>
            <span>Address</span>
            <strong>{customer.address ?? "Not provided"}</strong>
          </div>
        </div>

        {editingCustomer ? (
          <form className={styles.form} onSubmit={handleCustomerSubmit}>
            <div className={styles.formGrid}>
              <label>
                Customer Name
                <input name="name" defaultValue={customer.name} />
              </label>

              <label>
                Phone
                <input name="phone" defaultValue={customer.phone ?? ""} />
              </label>

              <label>
                WhatsApp
                <input name="whatsapp" defaultValue={customer.whatsapp ?? ""} />
              </label>

              <label>
                Email
                <input name="email" defaultValue={customer.email ?? ""} />
              </label>
            </div>

            <label>
              Address
              <textarea
                name="address"
                rows={3}
                defaultValue={customer.address ?? ""}
              />
            </label>

            <div className={styles.actions}>
              <button
                type="submit"
                disabled={isSavingCustomer}
                className={styles.primaryButton}
              >
                {isSavingCustomer ? "Saving..." : "Save Customer"}
              </button>

              <button
                type="button"
                className={styles.secondaryButton}
                onClick={() => setEditingCustomer(false)}
              >
                Cancel
              </button>
            </div>
          </form>
        ) : null}
      </section>

      <section className={styles.section}>
        <div className={styles.sectionHeader}>
          <div>
            <h2>Issue & Deliver</h2>
            <p>Generate the invoice PDF and record the delivery channel.</p>
          </div>
        </div>

        <div className={styles.channelGrid}>
          {(Object.keys(deliveryLabels) as DeliveryChannel[]).map((channel) => (
            <button
              key={channel}
              type="button"
              className={styles.channelButton}
              disabled={issuingChannel !== null}
              onClick={() => handleIssue(channel)}
            >
              {issuingChannel === channel ? "Issuing..." : `Issue via ${deliveryLabels[channel]}`}
            </button>
          ))}
        </div>

        <div className={styles.documentRow}>
          <div>
            <span>Latest issued PDF</span>
            <strong>
              {invoiceDocument
                ? `Saved ${new Date(invoiceDocument.generatedAt).toLocaleString()}`
                : "No issued document yet"}
            </strong>
          </div>

          {invoiceDocument ? (
            <a
              href={`/api/invoices/${invoiceId}/pdf`}
              target="_blank"
              rel="noreferrer"
              className={styles.secondaryButton}
            >
              Open issued PDF
            </a>
          ) : null}
        </div>
      </section>

      <section className={styles.section}>
        <div className={styles.sectionHeader}>
          <div>
            <h2>Payments</h2>
            <p>Record receipts and generate a PDF receipt for each payment.</p>
          </div>
        </div>

        <form className={styles.form} onSubmit={handlePaymentSubmit}>
          <div className={styles.formGrid}>
            <label>
              Amount GHS
              <input
                name="amountGhs"
                inputMode="decimal"
                value={paymentAmount}
                onChange={(event) => setPaymentAmount(event.target.value)}
                placeholder="0.00"
              />
            </label>

            <label>
              Method
              <select
                name="method"
                value={paymentMethod}
                onChange={(event) =>
                  setPaymentMethod(event.target.value as PaymentMethod)
                }
              >
                {(Object.keys(paymentLabels) as PaymentMethod[]).map((method) => (
                  <option key={method} value={method}>
                    {paymentLabels[method]}
                  </option>
                ))}
              </select>
            </label>
          </div>

          <label>
            Reference
            <input name="reference" placeholder="Optional transaction reference" />
          </label>

          <label>
            Notes
            <textarea
              name="notes"
              rows={3}
              placeholder="Optional note about this payment"
            />
          </label>

          <div className={styles.actions}>
            <button
              type="submit"
              disabled={isRecordingPayment}
              className={styles.primaryButton}
            >
              {isRecordingPayment ? "Recording..." : "Record Payment"}
            </button>
          </div>
        </form>

        <div className={styles.historyGrid}>
          <div>
            <h3>Recent Payments</h3>
            {payments.length === 0 ? (
              <p className={styles.emptyText}>No payments recorded yet.</p>
            ) : (
              <div className={styles.historyList}>
                {payments.map((payment) => (
                  <article key={payment.id} className={styles.historyItem}>
                    <div>
                      <strong>
                        GHS {payment.amountGhs} · {paymentLabels[payment.method]}
                      </strong>
                      <p>{new Date(payment.paidAt).toLocaleString()}</p>
                    </div>

                    <div className={styles.historyMeta}>
                      {payment.reference ? <span>Ref: {payment.reference}</span> : null}
                      {payment.notes ? <span>{payment.notes}</span> : null}
                      <a
                        href={`/api/payments/${payment.id}/receipt`}
                        target="_blank"
                        rel="noreferrer"
                        className={styles.receiptLink}
                      >
                        View receipt
                      </a>
                    </div>
                  </article>
                ))}
              </div>
            )}
          </div>
        </div>
      </section>

      <section className={styles.section}>
        <div className={styles.sectionHeader}>
          <div>
            <h2>Delivery History</h2>
            <p>Tracked issue attempts for this invoice.</p>
          </div>
        </div>

        {deliveries.length === 0 ? (
          <p className={styles.emptyText}>No deliveries recorded yet.</p>
        ) : (
          <div className={styles.historyList}>
            {deliveries.map((delivery) => (
              <article key={delivery.id} className={styles.historyItem}>
                <div>
                  <strong>
                    {deliveryLabels[delivery.channel]} · {delivery.status.replaceAll("_", " ")}
                  </strong>
                  <p>{new Date(delivery.createdAt).toLocaleString()}</p>
                </div>

                <div className={styles.historyMeta}>
                  {delivery.recipient ? <span>Recipient: {delivery.recipient}</span> : null}
                  {delivery.sentAt ? <span>Sent: {new Date(delivery.sentAt).toLocaleString()}</span> : null}
                  {delivery.notes ? <span>{delivery.notes}</span> : null}
                </div>
              </article>
            ))}
          </div>
        )}
      </section>

      <section className={styles.section}>
        <div className={styles.sectionHeader}>
          <div>
            <h2>Shipment</h2>
            <p>Update tracking, description and container assignment only.</p>
          </div>
        </div>

        <div className={styles.shipmentList}>
          {shipments.map((shipment) => {
            const isEditing = editingShipmentId === shipment.id;

            return (
              <article key={shipment.id} className={styles.shipmentCard}>
                <div className={styles.shipmentSummary}>
                  <div>
                    <span>Tracking</span>
                    <strong>{shipment.trackingNumber ?? shipment.shipmentNumber}</strong>
                  </div>

                  <div>
                    <span>Container</span>
                    <strong>{shipment.containerNumber ?? "Not assigned"}</strong>
                  </div>

                  <div>
                    <span>Description</span>
                    <strong>{shipment.description ?? "Not provided"}</strong>
                  </div>

                  <button
                    type="button"
                    className={styles.editButton}
                    onClick={() =>
                      setEditingShipmentId((current) =>
                        current === shipment.id ? null : shipment.id
                      )
                    }
                  >
                    {isEditing ? "Close" : "Edit"}
                  </button>
                </div>

                {isEditing ? (
                  <form
                    className={styles.form}
                    onSubmit={(event) => handleShipmentSubmit(event, shipment.id)}
                  >
                    <input type="hidden" name="shippingMode" value={shipment.shippingMode} />
                    <input type="hidden" name="serviceType" value={shipment.serviceType} />
                    <input type="hidden" name="goodsCategory" value={shipment.goodsCategory} />
                    <input type="hidden" name="goodsType" value={shipment.goodsType ?? ""} />
                    <input type="hidden" name="weightKg" value={shipment.weightKg ?? ""} />
                    <input type="hidden" name="chargeableWeightKg" value={shipment.chargeableWeightKg ?? ""} />
                    <input type="hidden" name="declaredCbm" value={shipment.declaredCbm ?? ""} />
                    <input type="hidden" name="actualCbm" value={shipment.actualCbm ?? ""} />
                    <input type="hidden" name="chargeableCbm" value={shipment.chargeableCbm ?? ""} />
                    <input type="hidden" name="dateReceived" value={shipment.dateReceived ?? ""} />

                    <div className={styles.formGrid}>
                      <label>
                        Tracking Number
                        <input name="trackingNumber" defaultValue={shipment.trackingNumber ?? ""} />
                      </label>

                      <label>
                        Container
                        <select name="containerId" defaultValue={shipment.containerId ?? ""}>
                          <option value="">No container assigned</option>
                          {containerOptions.map((container) => (
                            <option key={container.id} value={container.id}>
                              {container.containerNumber} ({container.status})
                            </option>
                          ))}
                        </select>
                      </label>
                    </div>

                    <label>
                      Description
                      <textarea name="description" rows={3} defaultValue={shipment.description ?? ""} />
                    </label>

                    <div className={styles.actions}>
                      <button
                        type="submit"
                        disabled={savingShipmentId === shipment.id}
                        className={styles.primaryButton}
                      >
                        {savingShipmentId === shipment.id ? "Saving..." : "Save Shipment"}
                      </button>

                      <button
                        type="button"
                        className={styles.secondaryButton}
                        onClick={() => setEditingShipmentId(null)}
                      >
                        Cancel
                      </button>
                    </div>
                  </form>
                ) : null}
              </article>
            );
          })}
        </div>
      </section>
    </div>
  );
}
