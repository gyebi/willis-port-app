
"use client";

import { FormEvent, useState } from "react";
import { firebaseAuth } from "@/lib/firebase/client";

type AgentEntryFormProps = {
  userName: string;
};

export default function AgentEntryForm({
  userName,
}: AgentEntryFormProps) {
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [isSaving, setIsSaving] = useState(false);

  const [dateReceived, setDateReceived] = useState("");
  const [eta, setEta] = useState("");
  const [estimatedLoadingDate, setEstimatedLoadingDate] = useState("");
  const [month, setMonth] = useState("");
  const [daysLeft, setDaysLeft] = useState("");

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    setMessage("");
    setError("");
    setIsSaving(true);

    const form = event.currentTarget;
    const formData = new FormData(form);

    try {
      const response = await fetch("/api/agent/entries", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          client: formData.get("client"),
          trackingNumber: formData.get("trackingNumber"),
          description: formData.get("description"),
          shippingMode: formData.get("shippingMode"),
          weight: formData.get("weight"),
          cbm: formData.get("cbm"),
          dateReceived: formData.get("dateReceived"),
          estimatedLoadingDate: formData.get("estimatedLoadingDate"),
          eta: formData.get("eta"),
          goodsType: formData.get("goodsType"),
          actualCbm: formData.get("actualCbm"),
          chargeableCbm: formData.get("chargeableCbm"),
          shippingCost: formData.get("shippingCost"),
          willisPortCharges: formData.get("willisPortCharges"),
          profit: formData.get("profit"),
          container: formData.get("container"),
          month: formData.get("month"),
          daysLeft: formData.get("daysLeft"),
          status: formData.get("status"),
        }),
      });

      const result = await response.json();

      if (!response.ok) {
        setError(result?.error ?? "Unable to save entry.");
        return;
      }

      setMessage(
        result?.shipment?.shipmentNumber
          ? `Shipment ${result.shipment.shipmentNumber} saved successfully.`
          : "Entry saved successfully."
      );
      form.reset();
      setDateReceived("");
      setEta("");
      setEstimatedLoadingDate("");
      setMonth("");
      setDaysLeft("");
    } catch {
      setError("Unable to save entry. Please try again.");
    } finally {
      setIsSaving(false);
    }
  }

  function calculateShipmentDates(receivedDate: string) {
    if (!receivedDate) {
      setEta("");
      setEstimatedLoadingDate("");
      setMonth("");
      setDaysLeft("");
      return;
    }

    const received = new Date(`${receivedDate}T00:00:00`);

    if (Number.isNaN(received.getTime())) {
      return;
    }

    const etaDate = new Date(received);
    etaDate.setDate(etaDate.getDate() + 60);

    const loadingDate = new Date(etaDate);
    loadingDate.setDate(loadingDate.getDate() + 7);

    const formatDate = (date: Date) =>
      date.toISOString().slice(0, 10);

    setEta(formatDate(etaDate));
    setEstimatedLoadingDate(formatDate(loadingDate));

    setMonth(
      etaDate.toLocaleString("en-US", {
        month: "long",
        year: "numeric",
      })
    );

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const differenceMs = etaDate.getTime() - today.getTime();

    const differenceDays = Math.ceil(
      differenceMs / (1000 * 60 * 60 * 24)
    );

    if (differenceDays > 0) {
      setDaysLeft(`${differenceDays} DAYS LEFT`);
    } else if (differenceDays === 0) {
      setDaysLeft("ARRIVES TODAY");
    } else {
      setDaysLeft(`${Math.abs(differenceDays)} DAYS PAST ETA`);
    }
  }

  async function handleSignOut() {
    await fetch("/api/auth/logout", {
      method: "POST",
    });

    await firebaseAuth.signOut();

    window.location.href = "/sign-in";
  }

  return (
    <main className="agentEntryPage">
      <div className="agentEntryShell">
        <header className="agentHeader">
          <div>
            <p className="brandEyebrow">WILLIS PORT</p>
            <h1>Shipment Entry Form</h1>
            <p>Enter shipment information received from customers.</p>
          </div>

          <div className="agentIdentity">
            <span>Signed in as</span>
            <strong>{userName}</strong>


            <button
              type="button"
              className="signOutButton"
              onClick={handleSignOut}
            >
              Sign Out
            </button>
          </div>

        </header>

        <form onSubmit={handleSubmit}>
          <section className="formSection">
            <h2>Customer & Shipment</h2>

            <div className="formGrid">
              <label>
                CLIENT
                <input name="client" type="text" required />
              </label>

              <label>
                TRACKING NUMBER
                <input name="trackingNumber" type="text" />
              </label>

              <label className="wideField">
                DESCRIPTION
                <input name="description" type="text" />
              </label>

              <label>
                SHIPPING MODE
                <select name="shippingMode" defaultValue="" required>
                  <option value="" disabled>
                    Select shipping mode
                  </option>
                  <option value="SEA">SEA</option>
                  <option value="AIR">AIR</option>
                  <option value="UNKNOWN">UNKNOWN</option>
                </select>
              </label>

              <label>
                GOODS TYPE
                <input name="goodsType" type="text" />
              </label>

              <label>
                CONTAINER
                <input name="container" type="text" />
              </label>

              <label>
                STATUS
                <select name="status" defaultValue="RECEIVED">
                  <option value="RECEIVED">RECEIVED</option>
                  <option value="ORIGIN">ORIGIN</option>
                  <option value="LOADING_SCHEDULED">
                    LOADING SCHEDULED
                  </option>
                  <option value="IN_TRANSIT">IN TRANSIT</option>
                  <option value="CUSTOMS_CLEARANCE">
                    CUSTOMS CLEARANCE
                  </option>
                  <option value="WAREHOUSE">WAREHOUSE</option>
                  <option value="DELIVERED">DELIVERED</option>
                  <option value="CANCELLED">CANCELLED</option>
                </select>
              </label>
            </div>
          </section>

          <section className="formSection">
            <h2>Measurements</h2>

            <div className="formGrid">
              <label>
                WEIGHT
                <input
                  name="weight"
                  type="number"
                  step="0.001"
                  min="0"
                />
              </label>

              <label>
                CBM
                <input
                  name="cbm"
                  type="number"
                  step="0.001"
                  min="0"
                />
              </label>

              <label>
                ACTUAL CBM
                <input
                  name="actualCbm"
                  type="number"
                  step="0.001"
                  min="0"
                />
              </label>

              <label>
                CHARGEABLE CBM
                <input
                  name="chargeableCbm"
                  type="number"
                  step="0.001"
                  min="0"
                />
              </label>
            </div>
          </section>

          <section className="formSection">
            <h2>Shipment Dates</h2>

            <div className="formGrid">
              <label>
                DATE RECEIVED
                <input
                  name="dateReceived"
                  type="date"
                  value={dateReceived}
                  onChange={(event) => {
                    const value = event.target.value;
                    setDateReceived(value);
                    calculateShipmentDates(value);
                  }}
                />
              </label>

              <label>
                ESTIMATED LOADING DATE
                <input name="estimatedLoadingDate" type="date" />
              </label>

              <label>
                ETA (ARRIVAL)
                <input
                  name="eta"
                  type="date"
                  value={eta}
                  readOnly
                />
              </label>

              <label>
                MONTH
                <input
                  name="month"
                  type="text"
                  value={month}
                  readOnly
                />
              </label>

              <label>
                DAYS LEFT
                <input
                  name="daysLeft"
                  type="text"
                  value={daysLeft}
                  readOnly
                />
              </label>
            </div>
          </section>

          <section className="formSection">
            <h2>Financial Information</h2>

            <div className="formGrid">
              <label>
                SHIPPING COST
                <input
                  name="shippingCost"
                  type="number"
                  step="0.01"
                  min="0"
                />
              </label>

              <label>
                WILLISPORT CHARGES
                <input
                  name="willisPortCharges"
                  type="number"
                  step="0.01"
                  min="0"
                />
              </label>

              <label>
                PROFIT
                <input
                  name="profit"
                  type="number"
                  step="0.01"
                />
              </label>
            </div>
          </section>

          {error ? (
            <p role="alert" className="formError">
              {error}
            </p>
          ) : null}

          {message ? (
            <p role="status" className="formMessage">
              {message}
            </p>
          ) : null}

          <div className="formActions">
            <button type="submit" disabled={isSaving}>
              {isSaving ? "Saving..." : "Save Entry"}
            </button>
          </div>
        </form>
      </div>
    </main>
  );
}
