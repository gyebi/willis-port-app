
"use client";

import { FormEvent, useState } from "react";
import { firebaseAuth } from "@/lib/firebase/client";
import {
  formatDateOnly,
  formatDaysLeftLabel,
  resolveShipmentSchedule,
} from "@/lib/shipment-scheduling";

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
  const schedule = resolveShipmentSchedule({
    dateReceived,
  });

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
          goodsType: formData.get("goodsType"),
          actualCbm: formData.get("actualCbm"),
          chargeableCbm: formData.get("chargeableCbm"),
          container: formData.get("container"),
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
    } catch {
      setError("Unable to save entry. Please try again.");
    } finally {
      setIsSaving(false);
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
                  required
                  onChange={(event) => {
                    setDateReceived(event.target.value);
                  }}
                />
              </label>

              <label>
                CALCULATED EST. LOADING DATE
                <input
                  type="date"
                  value={formatDateOnly(
                    schedule.calculatedEstimatedLoadingDate
                  )}
                  readOnly
                />
              </label>

              <label>
                ETA (ARRIVAL)
                <input
                  name="eta"
                  type="date"
                  value={formatDateOnly(schedule.eta)}
                  readOnly
                />
              </label>

              <label>
                SORTING COMPLETE
                <input
                  type="date"
                  value={formatDateOnly(schedule.sortingCompleteDate)}
                  readOnly
                />
              </label>

              <label>
                COLLECTION DATE
                <input
                  type="date"
                  value={formatDateOnly(schedule.collectionDate)}
                  readOnly
                />
              </label>

              <label>
                MONTH
                <input
                  type="text"
                  value={schedule.monthLabel ?? ""}
                  readOnly
                />
              </label>

              <label>
                DAYS LEFT
                <input
                  type="text"
                  value={formatDaysLeftLabel(
                    schedule.daysLeftToCollection
                  )}
                  readOnly
                />
              </label>

              <label>
                DAYS TO LOADING
                <input
                  type="text"
                  value={
                    schedule.daysToLoading === null
                      ? ""
                      : `${schedule.daysToLoading} DAYS`
                  }
                  readOnly
                />
              </label>

              <label>
                TRANSIT DAYS
                <input
                  type="text"
                  value={
                    schedule.transitDays === null
                      ? ""
                      : `${schedule.transitDays} DAYS`
                  }
                  readOnly
                />
              </label>

              <label>
                SORTING DAYS
                <input
                  type="text"
                  value={
                    schedule.sortingDays === null
                      ? ""
                      : `${schedule.sortingDays} DAYS`
                  }
                  readOnly
                />
              </label>

              <label>
                TOTAL TO COLLECTION
                <input
                  type="text"
                  value={
                    schedule.totalDaysToCollection === null
                      ? ""
                      : `${schedule.totalDaysToCollection} DAYS`
                  }
                  readOnly
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
