-- AlterTable
ALTER TABLE "Invoice" ADD COLUMN     "customerId" TEXT,
ALTER COLUMN "customerRequestId" DROP NOT NULL;

-- CreateTable
CREATE TABLE "InvoiceLine" (
    "id" TEXT NOT NULL,
    "invoiceId" TEXT NOT NULL,
    "shipmentId" TEXT NOT NULL,
    "shipmentPricingId" TEXT NOT NULL,
    "description" TEXT,
    "pricingBasis" "ShipmentPricingBasis" NOT NULL,
    "billableQuantity" DECIMAL(65,30),
    "unitRateUsd" DECIMAL(65,30),
    "lineTotalUsd" DECIMAL(65,30) NOT NULL,
    "lineTotalGhs" DECIMAL(65,30) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "InvoiceLine_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "InvoiceLine_invoiceId_idx" ON "InvoiceLine"("invoiceId");

-- CreateIndex
CREATE INDEX "InvoiceLine_shipmentId_idx" ON "InvoiceLine"("shipmentId");

-- CreateIndex
CREATE INDEX "InvoiceLine_shipmentPricingId_idx" ON "InvoiceLine"("shipmentPricingId");

-- CreateIndex
CREATE INDEX "Invoice_customerId_idx" ON "Invoice"("customerId");

-- AddForeignKey
ALTER TABLE "Invoice" ADD CONSTRAINT "Invoice_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "Customer"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "InvoiceLine" ADD CONSTRAINT "InvoiceLine_invoiceId_fkey" FOREIGN KEY ("invoiceId") REFERENCES "Invoice"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "InvoiceLine" ADD CONSTRAINT "InvoiceLine_shipmentId_fkey" FOREIGN KEY ("shipmentId") REFERENCES "Shipment"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "InvoiceLine" ADD CONSTRAINT "InvoiceLine_shipmentPricingId_fkey" FOREIGN KEY ("shipmentPricingId") REFERENCES "ShipmentPricing"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
