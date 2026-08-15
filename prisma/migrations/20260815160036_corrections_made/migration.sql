/*
  Warnings:

  - Made the column `description` on table `InvoiceLine` required. This step will fail if there are existing NULL values in that column.

*/
-- AlterTable
ALTER TABLE "InvoiceLine" ALTER COLUMN "shipmentId" DROP NOT NULL,
ALTER COLUMN "shipmentPricingId" DROP NOT NULL,
ALTER COLUMN "description" SET NOT NULL,
ALTER COLUMN "pricingBasis" DROP NOT NULL;

-- CreateIndex
CREATE INDEX "InvoiceLine_lineType_idx" ON "InvoiceLine"("lineType");
