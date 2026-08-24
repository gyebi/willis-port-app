
-- AlterTable
ALTER TABLE "Shipment"
ADD COLUMN "enteredByUserId" TEXT,
ADD COLUMN "shippingCostGhs" DECIMAL(65,30),
ADD COLUMN "willisPortChargesGhs" DECIMAL(65,30),
ADD COLUMN "profitGhs" DECIMAL(65,30);

-- CreateIndex
CREATE INDEX "Shipment_enteredByUserId_idx"
ON "Shipment"("enteredByUserId");

-- AddForeignKey
ALTER TABLE "Shipment"
ADD CONSTRAINT "Shipment_enteredByUserId_fkey"
FOREIGN KEY ("enteredByUserId")
REFERENCES "AppUser"("id")
ON DELETE SET NULL
ON UPDATE CASCADE;
