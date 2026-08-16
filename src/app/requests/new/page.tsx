"use client";

import { useRouter } from "next/navigation";
import { FormEvent, useState } from "react";
import styles from "./page.module.css";


export default function NewRequestPage() {
    const [statusMessage, setStatusMessage] = useState("");
    const [isSubmitting, setIsSubmitting] = useState(false);
    const router = useRouter();

    type CustomerSearchResult = {
        id: string;
        name: string;
        phone: string | null;
        whatsapp: string | null;
        email: string | null;
        address: string | null;
        _count: {
            shipments: number;
        };
    };

    const [customerSearch, setCustomerSearch] = useState("");
    const [customerResults, setCustomerResults] =
        useState<CustomerSearchResult[]>([]);
    const [selectedCustomer, setSelectedCustomer] =
        useState<CustomerSearchResult | null>(null);
    const [isSearching, setIsSearching] = useState(false);


    async function handleCustomerSearch() {
        const query = customerSearch.trim();

        if (query.length < 2) {
            setStatusMessage(
                "Enter at least 2 characters to search."
            );
            return;
        }

        try {
            setIsSearching(true);
            setStatusMessage("");

            const response = await fetch(
                `/api/customers/search?q=${encodeURIComponent(query)}`
            );

            const result = await response.json();

            if (!response.ok) {
                setStatusMessage(
                    result.message ?? "Unable to search customers."
                );
                return;
            }

            setCustomerResults(result.customers);
        } catch {
            setStatusMessage("Unable to search customers.");
        } finally {
            setIsSearching(false);
        }
    }


    function selectCustomer(customer: CustomerSearchResult) {
        setSelectedCustomer(customer);
        setCustomerResults([]);
        setCustomerSearch("");
        setStatusMessage("");
    }


    async function handleSubmit(event: FormEvent<HTMLFormElement>) {
        event.preventDefault();

        setStatusMessage("");
        setIsSubmitting(true);

        const form = event.currentTarget;

        const formData = new FormData(form);

        const requestData = {
            customerId: selectedCustomer?.id ?? null,
            customerName: String(formData.get("customerName") ?? ""),
            phone: String(formData.get("phone") ?? ""),
            email: String(formData.get("email") ?? ""),
            requestSource: String(formData.get("requestSource") ?? ""),
            shippingMethod: String(formData.get("shippingMethod") ?? ""),
            goodsCategory: String(formData.get("goodsCategory") ?? ""),

            weightKg: formData.get("weightKg")
                ? Number(formData.get("weightKg"))
                : undefined,

            volumeCbm: formData.get("volumeCbm")
                ? Number(formData.get("volumeCbm"))
                : undefined,

            goodsDescription: String(
                formData.get("goodsDescription") ?? ""
            ),
        };

        try {
            const response = await fetch("/api/requests", {
                method: "POST",

                headers: {
                    "Content-Type": "application/json",
                },

                body: JSON.stringify(requestData),
            });

            const result = await response.json();

            if (!response.ok) {
                setStatusMessage(result.message ?? "Unable to save request.");
                return;
            }

            setStatusMessage(
                `Request saved successfully: ${result.requestNumber}`
            );

            router.push(`/customers/${result.customerId}`);
        } catch {
            setStatusMessage(
                "Something went wrong while saving the request."
            );
        } finally {
            setIsSubmitting(false);
        }
    }
    return (
        <main className={styles.page}>
            <div className={styles.container}>
                <header className={styles.header}>
                    <p className={styles.eyebrow}>WILLIS PORT</p>

                    <h1>New Customer Request</h1>

                    <p>
                        Capture the customer and shipment information before generating an
                        invoice.
                    </p>
                </header>

                <form
                    className={styles.form}
                    onSubmit={handleSubmit}
                >
                    <section className={styles.section}>
                        <div className={styles.sectionTitle}>
                            <span>1</span>

                            <div>
                                <h2>Customer Information</h2>
                                <p>Who is requesting the shipping service?</p>
                            </div>
                        </div>

                        <div style={{ marginBottom: "24px" }}>
                            <label>
                                Find Existing Customer
                                <div
                                    style={{
                                        display: "flex",
                                        gap: "10px",
                                        marginTop: "8px",
                                    }}
                                >
                                    <input
                                        type="text"
                                        value={customerSearch}
                                        placeholder="Search name, phone or email"
                                        onChange={(event) =>
                                            setCustomerSearch(event.target.value)
                                        }
                                    />

                                    <button
                                        type="button"
                                        onClick={handleCustomerSearch}
                                        disabled={isSearching}
                                    >
                                        {isSearching ? "Searching..." : "Search"}
                                    </button>
                                </div>
                            </label>

                            {customerResults.length > 0 && (
                                <div style={{ marginTop: "10px" }}>
                                    {customerResults.map((customer) => (
                                        <button
                                            key={customer.id}
                                            type="button"
                                            onClick={() => selectCustomer(customer)}
                                            style={{
                                                width: "100%",
                                                textAlign: "left",
                                                padding: "12px",
                                                marginBottom: "6px",
                                            }}
                                        >
                                            <strong>{customer.name}</strong>
                                            {" — "}
                                            {customer.phone ?? "No phone"}
                                            {" — "}
                                            {customer._count.shipments} shipment(s)
                                        </button>
                                    ))}
                                </div>
                            )}

                            {selectedCustomer && (
                                <p>
                                    Existing customer selected:{" "}
                                    <strong>{selectedCustomer.name}</strong>
                                </p>
                            )}
                        </div>

                        <div className={styles.grid}>
                            <label>
                                Customer Name
                                <input
                                    type="text"
                                    name="customerName"
                                    placeholder="Enter customer name"
                                    defaultValue={selectedCustomer?.name ?? ""}
                                    key={selectedCustomer?.id ?? "new-name"}
                                    readOnly={Boolean(selectedCustomer)}
                                    required
                                />
                            </label>

                            <label>
                                Phone Number
                                <input
                                    type="tel"
                                    name="phone"
                                    placeholder="+233..."
                                    defaultValue={selectedCustomer?.phone ?? ""}
                                    key={`${selectedCustomer?.id ?? "new"}-phone`}
                                    readOnly={Boolean(selectedCustomer)}
                                    required
                                />
                            </label>

                            <label>
                                Email
                                <input
                                    type="email"
                                    name="email"
                                    placeholder="customer@example.com"
                                    defaultValue={selectedCustomer?.email ?? ""}
                                    key={`${selectedCustomer?.id ?? "new"}-email`}
                                    readOnly={Boolean(selectedCustomer)}
                                />
                            </label>

                            <label>
                                Request Source
                                <select name="requestSource" required defaultValue="">
                                    <option value="" disabled>
                                        Select source
                                    </option>

                                    <option value="WHATSAPP">WhatsApp</option>
                                    <option value="EMAIL">Email</option>
                                    <option value="PHONE">Phone Call</option>
                                    <option value="WALK_IN">Walk-in</option>
                                    <option value="WEBSITE">Website</option>
                                </select>
                            </label>
                        </div>
                    </section>

                    <section className={styles.section}>
                        <div className={styles.sectionTitle}>
                            <span>2</span>

                            <div>
                                <h2>Shipment Information</h2>
                                <p>What is Willis Port shipping for the customer?</p>
                            </div>
                        </div>

                        <div className={styles.grid}>
                            <label>
                                Shipping Method
                                <select name="shippingMethod" required defaultValue="">
                                    <option value="" disabled>
                                        Select method
                                    </option>

                                    <option value="AIR">Air Freight</option>
                                    <option value="SEA">Sea Freight</option>
                                </select>
                            </label>

                            <label>
                                Goods Category
                                <select name="goodsCategory" required defaultValue="">
                                    <option value="" disabled>
                                        Select category
                                    </option>

                                    <option value="NORMAL">Normal Goods</option>
                                    <option value="SPECIAL">Special Goods</option>
                                </select>
                            </label>

                            <label>
                                Weight (kg)
                                <input
                                    type="number"
                                    name="weightKg"
                                    min="0"
                                    step="0.01"
                                    placeholder="0.00"
                                />
                            </label>

                            <label>
                                Volume (CBM)
                                <input
                                    type="number"
                                    name="volumeCbm"
                                    min="0"
                                    step="0.001"
                                    placeholder="0.000"
                                />
                            </label>
                        </div>

                        <label className={styles.fullWidth}>
                            Goods Description
                            <textarea
                                name="goodsDescription"
                                rows={4}
                                placeholder="Describe the goods being shipped..."
                                required
                            />
                        </label>
                    </section>

                    {statusMessage && (
                        <p className={styles.statusMessage}>
                            {statusMessage}
                        </p>
                    )}

                    <div className={styles.actions}>
                        <button type="button" className={styles.cancelButton}>
                            Cancel
                        </button>

                        <button
                            type="submit"
                            className={styles.submitButton}
                            disabled={isSubmitting}
                        >
                            {isSubmitting ? "Saving..." : "Save Request"}
                        </button>
                    </div>
                </form>
            </div>
        </main>
    );
}
