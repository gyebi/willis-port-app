"use client";

import {
  FormEvent,
  KeyboardEvent as ReactKeyboardEvent,
  useEffect,
  useRef,
  useState,
} from "react";
import { firebaseAuth } from "@/lib/firebase/client";
import {
  formatDateOnly,
  formatDaysLeftLabel,
  resolveShipmentSchedule,
} from "@/lib/shipment-scheduling";

type AgentEntryFormProps = {
  userName: string;
};

type CustomerSearchResult = {
  id: string;
  customerId: string;
  name: string;
  phone: string | null;
  whatsapp: string | null;
  email: string | null;
  address: string | null;
  matchedShipmentNumber: string | null;
  _count: {
    shipments: number;
  };
};

type CustomerDetails = {
  customerName: string;
  phone: string;
  whatsapp: string;
  email: string;
  address: string;
};

const EMPTY_CUSTOMER_DETAILS: CustomerDetails = {
  customerName: "",
  phone: "",
  whatsapp: "",
  email: "",
  address: "",
};

function formatContactSummary(customer: CustomerSearchResult) {
  const details = [
    customer.phone,
    customer.whatsapp,
    customer.email,
  ].filter((value): value is string => Boolean(value));

  if (details.length > 0) {
    return details.join(" · ");
  }

  return "No contact details provided";
}

function normalizeText(value: string) {
  return value.trim();
}

export default function AgentEntryForm({
  userName,
}: AgentEntryFormProps) {
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [isSaving, setIsSaving] = useState(false);

  const [customerSearch, setCustomerSearch] = useState("");
  const [lookupResults, setLookupResults] = useState<
    CustomerSearchResult[]
  >([]);
  const [lookupError, setLookupError] = useState("");
  const [isSearching, setIsSearching] = useState(false);
  const [isLookupOpen, setIsLookupOpen] = useState(false);
  const [activeResultIndex, setActiveResultIndex] = useState(-1);
  const [selectedCustomer, setSelectedCustomer] = useState<
    CustomerSearchResult | null
  >(null);

  const [customerDetails, setCustomerDetails] =
    useState<CustomerDetails>(EMPTY_CUSTOMER_DETAILS);

  const [dateReceived, setDateReceived] = useState("");

  const lookupContainerRef = useRef<HTMLDivElement | null>(null);
  const searchRequestId = useRef(0);
  const searchAbortRef = useRef<AbortController | null>(null);

  const schedule = resolveShipmentSchedule({
    dateReceived,
  });

  useEffect(() => {
    function handlePointerDown(event: MouseEvent) {
      if (
        lookupContainerRef.current &&
        !lookupContainerRef.current.contains(
          event.target as Node
        )
      ) {
        setIsLookupOpen(false);
        setActiveResultIndex(-1);
      }
    }

    document.addEventListener(
      "mousedown",
      handlePointerDown
    );

    return () => {
      document.removeEventListener(
        "mousedown",
        handlePointerDown
      );
    };
  }, []);

  useEffect(() => {
    const query = normalizeText(customerSearch);

    searchAbortRef.current?.abort();

    if (query.length < 2) {
      setLookupResults([]);
      setLookupError("");
      setIsSearching(false);
      setIsLookupOpen(false);
      setActiveResultIndex(-1);
      return;
    }

    setIsLookupOpen(true);
    setLookupError("");
    setIsSearching(true);

    const timeoutId = window.setTimeout(async () => {
      const requestId = searchRequestId.current + 1;
      searchRequestId.current = requestId;

      const controller = new AbortController();
      searchAbortRef.current = controller;

      try {
        const response = await fetch(
          `/api/customers/search?q=${encodeURIComponent(query)}`,
          {
            signal: controller.signal,
          }
        );

        const result = await response.json();

        if (searchRequestId.current !== requestId) {
          return;
        }

        if (!response.ok) {
          setLookupResults([]);
          setLookupError(
            result?.message ??
              "Unable to search customers."
          );
          setActiveResultIndex(-1);
          return;
        }

        const customers: CustomerSearchResult[] =
          result?.customers ?? [];

        setLookupResults(customers);
        setLookupError("");
        setActiveResultIndex(
          customers.length > 0 ? 0 : -1
        );
      } catch (searchError) {
        if (
          controller.signal.aborted ||
          searchRequestId.current !== requestId
        ) {
          return;
        }

        console.error("Customer search failed:", searchError);
        setLookupResults([]);
        setLookupError("Unable to search customers.");
        setActiveResultIndex(-1);
      } finally {
        if (searchRequestId.current === requestId) {
          setIsSearching(false);
        }
      }
    }, 300);

    return () => {
      window.clearTimeout(timeoutId);
    };
  }, [customerSearch]);

  function applyCustomer(customer: CustomerSearchResult) {
    setSelectedCustomer(customer);
    setCustomerDetails({
      customerName: customer.name,
      phone: customer.phone ?? "",
      whatsapp: customer.whatsapp ?? "",
      email: customer.email ?? "",
      address: customer.address ?? "",
    });
    setCustomerSearch("");
    setLookupResults([]);
    setLookupError("");
    setIsLookupOpen(false);
    setActiveResultIndex(-1);
  }

  function startNewCustomer() {
    setSelectedCustomer(null);
    setCustomerDetails(EMPTY_CUSTOMER_DETAILS);
    setCustomerSearch("");
    setLookupResults([]);
    setLookupError("");
    setIsLookupOpen(false);
    setActiveResultIndex(-1);
  }

  function handleLookupKeyDown(
    event: ReactKeyboardEvent<HTMLInputElement>
  ) {
    if (!isLookupOpen || lookupResults.length === 0) {
      if (event.key === "Escape") {
        setIsLookupOpen(false);
      }

      return;
    }

    if (event.key === "ArrowDown") {
      event.preventDefault();
      setActiveResultIndex((current) =>
        current < 0
          ? 0
          : (current + 1) % lookupResults.length
      );
      return;
    }

    if (event.key === "ArrowUp") {
      event.preventDefault();
      setActiveResultIndex((current) =>
        current <= 0
          ? lookupResults.length - 1
          : current - 1
      );
      return;
    }

    if (event.key === "Enter") {
      const selectedResult =
        lookupResults[
          activeResultIndex >= 0
            ? activeResultIndex
            : 0
        ];

      if (selectedResult) {
        event.preventDefault();
        applyCustomer(selectedResult);
      }
      return;
    }

    if (event.key === "Escape") {
      event.preventDefault();
      setIsLookupOpen(false);
      setActiveResultIndex(-1);
    }
  }

  async function handleSubmit(
    event: FormEvent<HTMLFormElement>
  ) {
    event.preventDefault();

    setMessage("");
    setError("");
    setIsSaving(true);

    const form = event.currentTarget;
    const formData = new FormData(form);

    try {
      const response = await fetch(
        "/api/agent/entries",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            existingCustomerId:
              selectedCustomer?.customerId ?? null,
            customerId:
              selectedCustomer?.customerId ?? null,
            customerName: customerDetails.customerName,
            client: customerDetails.customerName,
            phone: customerDetails.phone,
            whatsapp: customerDetails.whatsapp,
            email: customerDetails.email,
            address: customerDetails.address,
            trackingNumber:
              formData.get("trackingNumber"),
            description: formData.get("description"),
            shippingMode:
              formData.get("shippingMode"),
            weight: formData.get("weight"),
            cbm: formData.get("cbm"),
            dateReceived,
            goodsType: formData.get("goodsType"),
            actualCbm: formData.get("actualCbm"),
            chargeableCbm:
              formData.get("chargeableCbm"),
            container: formData.get("container"),
            status: formData.get("status"),
          }),
        }
      );

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
      startNewCustomer();
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

  const lookupQuery = normalizeText(customerSearch);
  const showLookupDropdown =
    isLookupOpen && lookupQuery.length >= 2;

  return (
    <main className="agentEntryPage">
      <div className="agentEntryShell">
        <header className="agentHeader">
          <div>
            <p className="brandEyebrow">WILLIS PORT</p>
            <h1>Shipment Entry Form</h1>
            <p>
              Enter shipment information received from customers.
            </p>
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
            <div className="sectionHeaderRow">
              <div>
                <h2>Customer Lookup</h2>
                <p className="sectionDescription">
                  Search by customer name or a historical WP-SHP shipment
                  number.
                </p>
              </div>

              {selectedCustomer ? (
                <button
                  type="button"
                  className="ghostButton"
                  onClick={startNewCustomer}
                >
                  + Create New Customer
                </button>
              ) : null}
            </div>

            <div
              className="lookupSection"
              ref={lookupContainerRef}
            >
              <label className="lookupField">
                Find Existing Customer
                <input
                  type="text"
                  value={customerSearch}
                  placeholder="Search customer name or WP-SHP shipment number..."
                  autoComplete="off"
                  onChange={(event) => {
                    setCustomerSearch(event.target.value);
                  }}
                  onFocus={() => {
                    if (lookupQuery.length >= 2) {
                      setIsLookupOpen(true);
                    }
                  }}
                  onKeyDown={handleLookupKeyDown}
                  aria-autocomplete="list"
                  aria-expanded={showLookupDropdown}
                  aria-controls="customer-lookup-results"
                />
              </label>

              {showLookupDropdown ? (
                <div
                  id="customer-lookup-results"
                  className="lookupDropdown"
                  role="listbox"
                >
                  {isSearching ? (
                    <div className="lookupStatus">
                      Searching...
                    </div>
                  ) : lookupError ? (
                    <div className="lookupStatus lookupStatusError">
                      {lookupError}
                    </div>
                  ) : lookupResults.length === 0 ? (
                    <div className="lookupStatus">
                      No matching customers found.
                    </div>
                  ) : (
                    lookupResults.map((customer, index) => {
                      const isActive =
                        index === activeResultIndex;

                      return (
                        <button
                          key={`${customer.customerId}-${customer.matchedShipmentNumber ?? "customer"}`}
                          type="button"
                          className={`lookupOption${isActive ? " lookupOptionActive" : ""}`}
                          role="option"
                          aria-selected={isActive}
                          onMouseEnter={() => {
                            setActiveResultIndex(index);
                          }}
                          onMouseDown={(event) => {
                            event.preventDefault();
                          }}
                          onClick={() => {
                            applyCustomer(customer);
                          }}
                        >
                          <strong>{customer.name}</strong>
                          <span>{formatContactSummary(customer)}</span>
                          {customer.matchedShipmentNumber ? (
                            <span className="lookupShipment">
                              Shipment: {customer.matchedShipmentNumber}
                            </span>
                          ) : null}
                        </button>
                      );
                    })
                  )}
                </div>
              ) : null}
            </div>

            {selectedCustomer ? (
              <div className="customerSummary">
                <div>
                  <p className="summaryEyebrow">
                    Existing customer selected
                  </p>
                  <strong>{selectedCustomer.name}</strong>
                  <p>
                    {formatContactSummary(selectedCustomer)}
                  </p>
                  {selectedCustomer.matchedShipmentNumber ? (
                    <p className="lookupShipment">
                      Matched via shipment:{" "}
                      {selectedCustomer.matchedShipmentNumber}
                    </p>
                  ) : null}
                </div>

                <button
                  type="button"
                  className="ghostButton"
                  onClick={startNewCustomer}
                >
                  Start New Customer
                </button>
              </div>
            ) : (
              <div className="customerSummary customerSummaryMuted">
                <div>
                  <p className="summaryEyebrow">
                    New customer path
                  </p>
                  <strong>No customer selected</strong>
                  <p>
                    Enter a new customer below or search to reuse an
                    existing one.
                  </p>
                </div>
              </div>
            )}
          </section>

          <section className="formSection">
            <div className="sectionHeaderRow">
              <div>
                <h2>Customer Details</h2>
                <p className="sectionDescription">
                  Restore the customer contact details before creating the
                  new shipment.
                </p>
              </div>
            </div>

            <div className="formGrid">
              <label className="wideField">
                CLIENT / CUSTOMER NAME
                <input
                  name="customerName"
                  type="text"
                  required
                  value={customerDetails.customerName}
                  onChange={(event) => {
                    setCustomerDetails((current) => ({
                      ...current,
                      customerName: event.target.value,
                    }));
                  }}
                />
              </label>

              <label>
                PHONE
                <input
                  name="phone"
                  type="tel"
                  required
                  value={customerDetails.phone}
                  onChange={(event) => {
                    setCustomerDetails((current) => ({
                      ...current,
                      phone: event.target.value,
                    }));
                  }}
                />
              </label>

              <label>
                WHATSAPP
                <input
                  name="whatsapp"
                  type="tel"
                  value={customerDetails.whatsapp}
                  onChange={(event) => {
                    setCustomerDetails((current) => ({
                      ...current,
                      whatsapp: event.target.value,
                    }));
                  }}
                />
              </label>

              <label>
                EMAIL
                <input
                  name="email"
                  type="email"
                  value={customerDetails.email}
                  onChange={(event) => {
                    setCustomerDetails((current) => ({
                      ...current,
                      email: event.target.value,
                    }));
                  }}
                />
              </label>

              <label className="wideField">
                ADDRESS
                <textarea
                  name="address"
                  rows={2}
                  value={customerDetails.address}
                  onChange={(event) => {
                    setCustomerDetails((current) => ({
                      ...current,
                      address: event.target.value,
                    }));
                  }}
                />
              </label>
            </div>
          </section>

          <section className="formSection">
            <h2>Shipment Details</h2>

            <div className="formGrid">
              <label>
                TRACKING NUMBER
                <input name="trackingNumber" type="text" />
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

              <label className="wideField">
                DESCRIPTION
                <input name="description" type="text" />
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

            <div className="subsectionHeader">
              <h3>Measurements</h3>
            </div>

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
                  type="date"
                  value={formatDateOnly(schedule.eta)}
                  readOnly
                />
              </label>

              <label>
                SORTING COMPLETE
                <input
                  type="date"
                  value={formatDateOnly(
                    schedule.sortingCompleteDate
                  )}
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
