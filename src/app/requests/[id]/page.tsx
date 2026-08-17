import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import styles from "./page.module.css";
import InvoicePanel from "./InvoicePanel";

export const dynamic = "force-dynamic";

type RequestDetailsPageProps = {
    params: Promise<{
        id: string;
    }>;
};

export default async function RequestDetailsPage({
    params,
}: RequestDetailsPageProps) {
    const { id } = await params;

    const request = await prisma.customerRequest.findUnique({
        where: {
            id,
        },
        select: {
            id: true,
            requestNumber: true,
            customerName: true,
            phone: true,
            email: true,
            requestSource: true,
            shippingMethod: true,
            goodsCategory: true,
            weightKg: true,
            volumeCbm: true,
            goodsDescription: true,
            status: true,
            createdAt: true,
            updatedAt: true,
            customerId: true,
            shipmentId: true,
        },
    });

    if (!request) {
        notFound();
    }

    return (
        <main className={styles.page}>
            <div className={styles.container}>
                <Link href="/" className={styles.backLink}>
                    ← Back to Dashboard
                </Link>

                <header className={styles.header}>
                    <div>
                        <p className={styles.eyebrow}>WILLIS PORT</p>
                        <h1>{request.requestNumber}</h1>
                        <p className={styles.subtitle}>
                            Customer shipping request
                        </p>
                    </div>

                    <span className={styles.status}>
                        {request.status.replaceAll("_", " ")}
                    </span>
                </header>

                <section className={styles.section}>
                    <h2>Customer Information</h2>

                    <div className={styles.grid}>
                        <div>
                            <span>Customer Name</span>
                            <strong>{request.customerName}</strong>
                        </div>

                        <div>
                            <span>Phone</span>
                            <strong>{request.phone}</strong>
                        </div>

                        <div>
                            <span>Email</span>
                            <strong>{request.email || "Not provided"}</strong>
                        </div>

                        <div>
                            <span>Request Source</span>
                            <strong>
                                {request.requestSource.replaceAll("_", " ")}
                            </strong>
                        </div>
                    </div>
                </section>

                <section className={styles.section}>
                    <h2>Shipment Information</h2>

                    <div className={styles.grid}>
                        <div>
                            <span>Shipping Method</span>
                            <strong>{request.shippingMethod}</strong>
                        </div>

                        <div>
                            <span>Goods Category</span>
                            <strong>{request.goodsCategory}</strong>
                        </div>

                        <div>
                            <span>Weight</span>
                            <strong>
                                {request.weightKg
                                    ? `${request.weightKg.toString()} kg`
                                    : "Not provided"}
                            </strong>
                        </div>

                        <div>
                            <span>Volume</span>
                            <strong>
                                {request.volumeCbm
                                    ? `${request.volumeCbm.toString()} CBM`
                                    : "Not provided"}
                            </strong>
                        </div>
                    </div>

                    <div className={styles.description}>
                        <span>Goods Description</span>
                        <p>{request.goodsDescription}</p>
                    </div>
                </section>

                <section className={styles.section}>
                    <h2>Request Information</h2>

                    <div className={styles.grid}>
                        <div>
                            <span>Created</span>
                            <strong>{request.createdAt.toLocaleString()}</strong>
                        </div>

                        <div>
                            <span>Last Updated</span>
                            <strong>{request.updatedAt.toLocaleString()}</strong>
                        </div>
                    </div>
                </section>

                <InvoicePanel
                    customerId={request.customerId}
                    shipmentId={request.shipmentId}
                />
            </div>
        </main >
    );
}
