import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import styles from "./page.module.css";
import GenerateInvoiceButton from "./GenerateInvoiceButton";

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
        include: {
            invoice: true,
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

                {request.invoice && (
                    <section className={styles.section}>
                        <h2>Invoice</h2>

                        <div className={styles.grid}>
                            <div>
                                <span>Invoice Number</span>
                                <strong>
                                    {request.invoice.invoiceNumber}
                                </strong>
                            </div>

                            <div>
                                <span>Status</span>
                                <strong>
                                    {request.invoice.status.replaceAll(
                                        "_",
                                        " "
                                    )}
                                </strong>
                            </div>

                            <div>
                                <span>Currency</span>
                                <strong>{request.invoice.currency}</strong>
                            </div>

                            <div>
                                <span>Valid Until</span>
                                <strong>
                                    {request.invoice.validUntil.toLocaleDateString()}
                                </strong>
                            </div>
                        </div>
                    </section>
                )}

                <GenerateInvoiceButton
                    requestId={request.id}
                    hasInvoice={Boolean(request.invoice)}
                />
            </div>
        </main >
    );
}
