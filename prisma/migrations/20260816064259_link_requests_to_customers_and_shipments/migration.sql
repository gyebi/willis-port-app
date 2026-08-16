/*
  Warnings:

  - A unique constraint covering the columns `[shipmentId]` on the table `CustomerRequest` will be added. If there are existing duplicate values, this will fail.

*/
-- AlterTable
ALTER TABLE "CustomerRequest" ADD COLUMN     "customerId" TEXT,
ADD COLUMN     "shipmentId" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX "CustomerRequest_shipmentId_key" ON "CustomerRequest"("shipmentId");

-- CreateIndex
CREATE INDEX "CustomerRequest_customerId_idx" ON "CustomerRequest"("customerId");

-- AddForeignKey
ALTER TABLE "CustomerRequest" ADD CONSTRAINT "CustomerRequest_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "Customer"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CustomerRequest" ADD CONSTRAINT "CustomerRequest_shipmentId_fkey" FOREIGN KEY ("shipmentId") REFERENCES "Shipment"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
