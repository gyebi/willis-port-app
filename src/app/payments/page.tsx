import Link from "next/link";
import { redirect } from "next/navigation";
import { Prisma } from "@/generated/prisma/client";

import { prisma } from "@/lib/prisma";
import { getSessionUser } from "@/lib/auth/get-session-user";

import styles from "./page.module.css";

export const dynamic = "force-dynamic";

type PaymentsPageProps = {
  searchParams: Promise<{
    q?: string;
    state?: string;
  }>;
};

type PaymentStateFilter = "all" | "unpaid" | "partial" | "paid";

function getPaymentAmount(
  payment: {
    amountGhs: Prisma.Decimal;
    amount: Prisma.Decimal | null;
  }
) {
  return payment.amount ?? payment.amountGhs;
}

function getInvoicePaymentSummary(
  invoice: {
    totalGhs: Prisma.Decimal;
    payments: Array<{
      amountGhs: Prisma.Decimal;
      amount: Prisma.Decimal | null;
    }>;
  }
) {
  const paidTotal = invoice.payments.reduce(
    (total, payment) => total.add(getPaymentAmount(payment)),
    new Prisma.Decimal(0)
  );

  const balance = invoice.totalGhs.sub(paidTotal);

  const paymentState =
    paidTotal.lessThanOrEqualTo(0)
      ? "unpaid"
      : balance.lessThanOrEqualTo(0)
        ? "paid"
        : "partial";

  return {
    paidTotal,
    balance: balance.lessThan(0) ? new Prisma.Decimal(0) : balance,
    paymentState,
  };
}

export default async function PaymentsPage({
  searchParams,
}: PaymentsPageProps) {
  const user = await getSessionUser();

  if (!user) {
    redirect("/sign-in");
  }

  if (user.role === "AGENT") {
    redirect("/agent/entry");
  }

  const { q = "", state = "all" } = await searchParams;
  const query = q.trim();
  const paymentStateFilter = (
    state.toLowerCase() as PaymentStateFilter
  );

  const invoices = await prisma.invoice.findMany({
    where: query
      ? {
          OR: [
            {
              invoiceNumber: {
                contains: query,
                mode: "insensitive",
              },
            },
            {
              customer: {
                is: {
                  name: {
                    contains: query,
                    mode: "insensitive",
                  },
                },
              },
            },
          ],
        }
      : undefined,
    include: {
      customer: true,
      payments: {
        orderBy: {
          paidAt: "desc",
        },
      },
      documents: {
        where: {
          isIssued: true,
        },
        take: 1,
      },
    },
    orderBy: {
      createdAt: "desc",
    },
  });

  const invoiceRows = invoices
    .map((invoice) => {
      const summary = getInvoicePaymentSummary(invoice);

      return {
        invoice,
        ...summary,
        latestPayment: invoice.payments[0] ?? null,
      };
    })
    .filter((row) => {
      if (paymentStateFilter === "all") {
        return true;
      }

      return row.paymentState === paymentStateFilter;
    });

  const totalInvoiced = invoices.reduce(
    (total, invoice) => total.add(invoice.totalGhs),
    new Prisma.Decimal(0)
  );

  const paymentsReceived = invoices.reduce(
    (total, invoice) =>
      total.add(getInvoicePaymentSummary(invoice).paidTotal),
    new Prisma.Decimal(0)
  );

  const outstanding = totalInvoiced.sub(paymentsReceived);

  const counts = invoiceRows.reduce(
    (acc, row) => {
      const key = row.paymentState as Exclude<PaymentStateFilter, "all">;
      acc[key] += 1;
      return acc;
    },
    {
      unpaid: 0,
      partial: 0,
      paid: 0,
    } as Record<Exclude<PaymentStateFilter, "all">, number>
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
            <h1>Payments Queue</h1>
            <p className={styles.subtitle}>
              Manager work list for issued invoices, receipts, and outstanding balances.
            </p>
          </div>
        </header>

        <section className={styles.summaryGrid}>
          <article className={styles.summaryCard}>
            <span>Total Invoiced</span>
            <strong>GHS {totalInvoiced.toString()}</strong>
          </article>

          <article className={styles.summaryCard}>
            <span>Payments Received</span>
            <strong>GHS {paymentsReceived.toString()}</strong>
          </article>

          <article className={styles.summaryCard}>
            <span>Outstanding</span>
            <strong>GHS {outstanding.lessThan(0) ? "0" : outstanding.toString()}</strong>
          </article>
        </section>

        <section className={styles.filterBar}>
          <form method="get" className={styles.filterForm}>
            <label>
              Search
              <input
                type="search"
                name="q"
                defaultValue={query}
                placeholder="Customer or invoice number"
              />
            </label>

            <label>
              Payment State
              <select name="state" defaultValue={paymentStateFilter}>
                <option value="all">All</option>
                <option value="unpaid">Unpaid</option>
                <option value="partial">Partial</option>
                <option value="paid">Paid</option>
              </select>
            </label>

            <button type="submit" className={styles.primaryButton}>
              Filter
            </button>
          </form>

          <div className={styles.quickCounts}>
            <span>Unpaid {counts.unpaid}</span>
            <span>Partial {counts.partial}</span>
            <span>Paid {counts.paid}</span>
          </div>
        </section>

        <section className={styles.tableSection}>
          <div className={styles.sectionHeader}>
            <div>
              <h2>Invoice Payment Rows</h2>
              <p>Select an invoice to open the existing workspace.</p>
            </div>
          </div>

          {invoiceRows.length === 0 ? (
            <div className={styles.emptyState}>
              No invoices match the current filter.
            </div>
          ) : (
            <div className={styles.tableWrapper}>
              <table className={styles.table}>
                <thead>
                  <tr>
                    <th>Invoice Number</th>
                    <th>Customer</th>
                    <th>Invoice Total</th>
                    <th>Amount Paid</th>
                    <th>Balance</th>
                    <th>Status</th>
                  </tr>
                </thead>

                <tbody>
                  {invoiceRows.map((row) => (
                    <tr key={row.invoice.id}>
                      <td>
                        <Link
                          href={`/invoices/${row.invoice.id}`}
                          className={styles.invoiceLink}
                        >
                          <strong>{row.invoice.invoiceNumber}</strong>
                        </Link>
                        {row.latestPayment ? (
                          <small>
                            Latest payment{" "}
                            {(row.latestPayment.amount ?? row.latestPayment.amountGhs).toString()}
                          </small>
                        ) : null}
                      </td>

                      <td>{row.invoice.customer?.name ?? "Unassigned"}</td>

                      <td>GHS {row.invoice.totalGhs.toString()}</td>

                      <td>GHS {row.paidTotal.toString()}</td>

                      <td>GHS {row.balance.toString()}</td>

                      <td>
                        <span className={`${styles.statusBadge} ${styles[row.paymentState]}`}>
                          {row.paymentState.toUpperCase()}
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
