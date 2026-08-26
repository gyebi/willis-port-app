import Link from "next/link";
import { Prisma } from "@/generated/prisma/client";

import { prisma } from "@/lib/prisma";
import { requireManagerUser } from "@/lib/auth/require-manager";

import styles from "../manager-queue.module.css";

export const dynamic = "force-dynamic";

type InvoicesPageProps = {
  searchParams: Promise<{
    q?: string;
    status?: string;
  }>;
};

type InvoiceFilter =
  | "all"
  | "draft"
  | "sent"
  | "awaiting_payment"
  | "paid"
  | "cancelled";

type InvoiceRow = {
  id: string;
  invoiceNumber: string;
  createdAt: Date;
  validUntil: Date;
  totalUsd: Prisma.Decimal;
  totalGhs: Prisma.Decimal;
  status: "DRAFT" | "SENT" | "AWAITING_PAYMENT" | "PAID" | "CANCELLED";
  customer: {
    name: string;
    phone: string | null;
    email: string | null;
  } | null;
  lines: Array<{
    id: string;
  }>;
};

export default async function InvoicesPage({
  searchParams,
}: InvoicesPageProps) {
  await requireManagerUser();

  const { q = "", status = "all" } = await searchParams;
  const query = q.trim();
  const selectedStatus = parseInvoiceFilter(status);
  const insensitive = "insensitive" as const;

  const invoiceQueryRows = (await prisma.invoice.findMany({
    where: query
      ? {
          OR: [
            {
              invoiceNumber: {
                contains: query,
                mode: insensitive,
              },
            },
            {
              customer: {
                is: {
                  OR: [
                    {
                      name: {
                        contains: query,
                        mode: insensitive,
                      },
                    },
                    {
                      phone: {
                        contains: query,
                        mode: insensitive,
                      },
                    },
                    {
                      email: {
                        contains: query,
                        mode: insensitive,
                      },
                    },
                  ],
                },
              },
            },
          ],
        }
      : undefined,
    orderBy: {
      createdAt: "desc",
    },
    include: {
      customer: {
        select: {
          name: true,
          phone: true,
          email: true,
        },
      },
      lines: {
        select: {
          id: true,
        },
      },
    },
  })) as unknown as Array<{
    id: string;
    invoiceNumber: string;
    createdAt: Date;
    validUntil: Date;
    subtotalUsd: Prisma.Decimal;
    totalGhs: Prisma.Decimal;
    status: "DRAFT" | "SENT" | "AWAITING_PAYMENT" | "PAID" | "CANCELLED";
    customer: {
      name: string;
      phone: string | null;
      email: string | null;
    } | null;
    lines: Array<{
      id: string;
    }>;
  }>;

  const invoices: InvoiceRow[] = invoiceQueryRows.map((invoice) => ({
    id: invoice.id,
    invoiceNumber: invoice.invoiceNumber,
    createdAt: invoice.createdAt,
    validUntil: invoice.validUntil,
    totalUsd: invoice.subtotalUsd,
    totalGhs: invoice.totalGhs,
    status: invoice.status,
    customer: invoice.customer,
    lines: invoice.lines,
  }));

  const filteredRows = invoices.filter((invoice) => {
    if (selectedStatus === "all") {
      return true;
    }

    return invoice.status.toLowerCase() === selectedStatus;
  });

  const counts = invoices.reduce(
    (acc, invoice) => {
      acc[invoice.status.toLowerCase() as Exclude<InvoiceFilter, "all">] += 1;
      return acc;
    },
    {
      draft: 0,
      sent: 0,
      awaiting_payment: 0,
      paid: 0,
      cancelled: 0,
    } as Record<Exclude<InvoiceFilter, "all">, number>
  );

  return (
    <main className={styles.page}>
      <div className={styles.container}>
        <Link href="/" className={styles.backLink}>
          ← Back to Dashboard
        </Link>

        <header className={styles.header}>
          <div>
            <p className={styles.eyebrow}>WILLIS PORT</p>
            <h1>Invoices Queue</h1>
            <p className={styles.subtitle}>
              Manager work list for draft, issued, and paid invoices.
            </p>
          </div>

          <div className={styles.headerActions}>
            <span className={styles.headerBadge}>
              {filteredRows.length.toLocaleString()} visible
            </span>
          </div>
        </header>

        <section className={styles.filterBar}>
          <form method="get" className={styles.searchForm}>
            <label className={styles.field}>
              Search invoice number, customer, phone or email...
              <input
                type="search"
                name="q"
                defaultValue={query}
                placeholder="Search invoice number, customer, phone or email..."
                className={styles.input}
              />
            </label>

            <label className={styles.field}>
              Status
              <select
                name="status"
                defaultValue={selectedStatus}
                className={styles.select}
              >
                <option value="all">All</option>
                <option value="draft">Draft</option>
                <option value="sent">Sent</option>
                <option value="awaiting_payment">Awaiting Payment</option>
                <option value="paid">Paid</option>
                <option value="cancelled">Cancelled</option>
              </select>
            </label>

            <button type="submit" className={styles.button}>
              Search
            </button>

            {query || selectedStatus !== "all" ? (
              <Link href="/invoices" className={styles.secondaryButton}>
                Clear
              </Link>
            ) : null}
          </form>

          <div className={styles.searchMeta}>
            <span className={styles.pill}>Draft {counts.draft}</span>
            <span className={styles.pill}>Sent {counts.sent}</span>
            <span className={styles.pill}>
              Awaiting {counts.awaiting_payment}
            </span>
            <span className={styles.pill}>Paid {counts.paid}</span>
            <span className={styles.pill}>Cancelled {counts.cancelled}</span>
          </div>
        </section>

        <section className={styles.tableSection}>
          <div className={styles.sectionHeader}>
            <div>
              <h2>Invoice Records</h2>
              <p>Select an invoice to open the existing invoice workspace.</p>
            </div>
          </div>

          {filteredRows.length === 0 ? (
            <div className={styles.emptyState}>
              {query || selectedStatus !== "all"
                ? "No invoices match the current filter."
                : "No invoices are available yet."}
            </div>
          ) : (
            <div className={styles.tableWrapper}>
              <table className={styles.table}>
                <thead>
                  <tr>
                    <th>Invoice Number</th>
                    <th>Customer</th>
                    <th>Items</th>
                    <th>Invoice Date</th>
                    <th>Valid Until</th>
                    <th>Total USD</th>
                    <th>Total GHS</th>
                    <th>Status</th>
                  </tr>
                </thead>

                <tbody>
                  {filteredRows.map((invoice) => (
                    <tr key={invoice.id}>
                      <td>
                        <Link href={`/invoices/${invoice.id}`} className={styles.rowLink}>
                          <strong>{invoice.invoiceNumber}</strong>
                        </Link>
                      </td>

                      <td>
                        <div className={styles.stack}>
                          <strong>{invoice.customer?.name ?? "Unassigned"}</strong>
                          {invoice.customer?.phone ? (
                            <span>{invoice.customer.phone}</span>
                          ) : null}
                          {invoice.customer?.email ? (
                            <span>{invoice.customer.email}</span>
                          ) : null}
                        </div>
                      </td>

                      <td>{invoice.lines.length}</td>

                      <td>{formatDate(invoice.createdAt)}</td>

                      <td>{formatDate(invoice.validUntil)}</td>

                      <td>USD {invoice.totalUsd.toString()}</td>

                      <td>GHS {invoice.totalGhs.toString()}</td>

                      <td>
                        <span
                          className={`${styles.statusBadge} ${styles[invoiceStatusClass(invoice.status)]}`}
                        >
                          {invoice.status.replaceAll("_", " ")}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>
      </div>
    </main>
  );
}

function parseInvoiceFilter(value: string): InvoiceFilter {
  if (
    value === "draft" ||
    value === "sent" ||
    value === "awaiting_payment" ||
    value === "paid" ||
    value === "cancelled"
  ) {
    return value;
  }

  return "all";
}

function formatDate(value: Date) {
  return value.toLocaleDateString();
}

function invoiceStatusClass(status: string) {
  if (status === "DRAFT") {
    return "draft";
  }

  if (status === "SENT") {
    return "sent";
  }

  if (status === "AWAITING_PAYMENT") {
    return "awaiting";
  }

  if (status === "PAID") {
    return "paid";
  }

  return "cancelled";
}
