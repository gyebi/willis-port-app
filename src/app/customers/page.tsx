export const dynamic = "force-dynamic";
import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { requireManagerUser } from "@/lib/auth/require-manager";

import styles from "./page.module.css";

type CustomersPageProps = {
  searchParams: Promise<{
    q?: string;
  }>;
};

type CustomerRow = {
  id: string;
  name: string;
  phone: string | null;
  whatsapp: string | null;
  email: string | null;
  address: string | null;
  _count: {
    shipments: number;
  };
  matchedShipmentNumber?: string | null;
};

type CustomerQueryRow = {
  id: string;
  name: string;
  phone: string | null;
  whatsapp: string | null;
  email: string | null;
  address: string | null;
  _count: {
    shipments: number;
  };
  shipments?: Array<{
    shipmentNumber: string;
  }>;
};

export default async function CustomersPage({
  searchParams,
}: CustomersPageProps) {
  await requireManagerUser();

  const { q = "" } = await searchParams;
  const query = q.trim();
  const insensitive = "insensitive" as const;

  const baseWhere = query
    ? {
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
            whatsapp: {
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
          {
            shipments: {
              some: {
                shipmentNumber: {
                  contains: query,
                  mode: insensitive,
                },
              },
            },
          },
        ],
      }
    : undefined;

  const customerQueryRows = (await prisma.customer.findMany({
    where: baseWhere,
    orderBy: {
      name: "asc",
    },
    include: {
      _count: {
        select: {
          shipments: true,
        },
      },
      ...(query
        ? {
            shipments: {
              where: {
                shipmentNumber: {
                  contains: query,
                  mode: insensitive,
                },
              },
              select: {
                shipmentNumber: true,
              },
              orderBy: {
                createdAt: "desc",
              },
              take: 1,
            },
          }
      : {}),
    },
  })) as unknown as CustomerQueryRow[];

  const customers: CustomerRow[] = customerQueryRows.map((customer) => ({
    id: customer.id,
    name: customer.name,
    phone: customer.phone,
    whatsapp: customer.whatsapp,
    email: customer.email,
    address: customer.address,
    _count: customer._count,
    matchedShipmentNumber: customer.shipments?.[0]?.shipmentNumber ?? null,
  }));

  return (
    <main className={styles.page}>
      <div className={styles.container}>
        <Link href="/" className={styles.backLink}>
          ← Back to Dashboard
        </Link>

        <div className={styles.header}>
          <div>
            <p className={styles.eyebrow}>WILLIS PORT</p>
            <h1>Customers</h1>
            <p className={styles.subtitle}>
              Customers and their shipment tracking records.
            </p>
          </div>
        </div>

        <section className={styles.searchSection}>
          <form method="get" className={styles.searchForm}>
            <label className={styles.searchLabel}>
              Search customer, phone, email or shipment number...
              <input
                type="search"
                name="q"
                defaultValue={query}
                placeholder="Search customer, phone, email or shipment number..."
                className={styles.searchInput}
              />
            </label>

            <div className={styles.searchActions}>
              <button type="submit" className={styles.searchButton}>
                Search
              </button>

              {query ? (
                <Link href="/customers" className={styles.clearLink}>
                  Clear
                </Link>
              ) : null}
            </div>
          </form>
        </section>

        {customers.length === 0 ? (
          <section className={styles.emptyState}>
            <h2>No customers yet</h2>

            <p>
              {query
                ? "No customers match the current search."
                : "Customers will appear here once they are added to the Willis Port system."}
            </p>
          </section>
        ) : (
          <section className={styles.customerList}>
            {customers.map((customer) => (
              <Link
                key={customer.id}
                href={`/customers/${customer.id}`}
                className={styles.customerCard}
              >
                <div>
                  <h2>{customer.name}</h2>

                  <p>{customer.phone ?? "No phone number"}</p>

                  <div className={styles.customerMeta}>
                    {customer.whatsapp ? (
                      <span>WhatsApp: {customer.whatsapp}</span>
                    ) : null}

                    {customer.email ? (
                      <span>Email: {customer.email}</span>
                    ) : null}

                    {customer.matchedShipmentNumber ? (
                      <span>
                        Matched shipment:{" "}
                        {customer.matchedShipmentNumber}
                      </span>
                    ) : null}
                  </div>
                </div>

                <div className={styles.shipmentCount}>
                  <strong>{customer._count.shipments}</strong>
                  <span>
                    {customer._count.shipments === 1
                      ? "Shipment"
                      : "Shipments"}
                  </span>
                </div>
              </Link>
            ))}
          </section>
        )}
      </div>
    </main>
  );
}
