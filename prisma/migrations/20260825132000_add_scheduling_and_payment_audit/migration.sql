-- AlterTable
ALTER TABLE "Shipment"
ADD COLUMN "calculatedEstimatedLoadingDate" TIMESTAMP(3),
ADD COLUMN "estimatedLoadingDateOverride" TIMESTAMP(3),
ADD COLUMN "estimatedLoadingOverrideReason" TEXT,
ADD COLUMN "estimatedLoadingOverrideAt" TIMESTAMP(3),
ADD COLUMN "estimatedLoadingOverrideByUserId" TEXT,
ADD COLUMN "sortingCompleteDate" TIMESTAMP(3),
ADD COLUMN "collectionDate" TIMESTAMP(3);

-- AlterTable
ALTER TABLE "Payment"
ADD COLUMN "amount" DECIMAL(65,30),
ADD COLUMN "paymentDate" TIMESTAMP(3),
ADD COLUMN "paymentMethod" "PaymentMethod",
ADD COLUMN "receivedByUserId" TEXT,
ADD COLUMN "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;

-- CreateIndex
CREATE INDEX "Shipment_collectionDate_idx" ON "Shipment"("collectionDate");

-- CreateIndex
CREATE INDEX "Shipment_estimatedLoadingOverrideByUserId_idx" ON "Shipment"("estimatedLoadingOverrideByUserId");

-- CreateIndex
CREATE INDEX "Payment_receivedByUserId_idx" ON "Payment"("receivedByUserId");

-- AddForeignKey
ALTER TABLE "Shipment" ADD CONSTRAINT "Shipment_estimatedLoadingOverrideByUserId_fkey" FOREIGN KEY ("estimatedLoadingOverrideByUserId") REFERENCES "AppUser"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Payment" ADD CONSTRAINT "Payment_receivedByUserId_fkey" FOREIGN KEY ("receivedByUserId") REFERENCES "AppUser"("id") ON DELETE SET NULL ON UPDATE CASCADE;
