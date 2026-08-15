-- CreateEnum
CREATE TYPE "ShipmentPricingBasis" AS ENUM ('CBM', 'KG', 'MANUAL');

-- CreateEnum
CREATE TYPE "ShipmentPricingStatus" AS ENUM ('DRAFT', 'APPROVED', 'SUPERSEDED');

-- CreateTable
CREATE TABLE "ShipmentPricing" (
    "id" TEXT NOT NULL,
    "shipmentId" TEXT NOT NULL,
    "pricingBasis" "ShipmentPricingBasis" NOT NULL,
    "status" "ShipmentPricingStatus" NOT NULL DEFAULT 'DRAFT',
    "actualCbm" DECIMAL(65,30),
    "chargeableCbm" DECIMAL(65,30),
    "weightKg" DECIMAL(65,30),
    "chargeableWeightKg" DECIMAL(65,30),
    "billableQuantity" DECIMAL(65,30),
    "unitRateUsd" DECIMAL(65,30),
    "manualChargeUsd" DECIMAL(65,30),
    "exchangeRateToGhs" DECIMAL(65,30) NOT NULL DEFAULT 1,
    "customerChargeUsd" DECIMAL(65,30) NOT NULL DEFAULT 0,
    "customerChargeGhs" DECIMAL(65,30) NOT NULL DEFAULT 0,
    "internalCostGhs" DECIMAL(65,30),
    "profitGhs" DECIMAL(65,30),
    "notes" TEXT,
    "approvedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ShipmentPricing_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "ShipmentPricing_shipmentId_idx" ON "ShipmentPricing"("shipmentId");

-- CreateIndex
CREATE INDEX "ShipmentPricing_status_idx" ON "ShipmentPricing"("status");

-- CreateIndex
CREATE INDEX "ShipmentPricing_pricingBasis_idx" ON "ShipmentPricing"("pricingBasis");

-- AddForeignKey
ALTER TABLE "ShipmentPricing" ADD CONSTRAINT "ShipmentPricing_shipmentId_fkey" FOREIGN KEY ("shipmentId") REFERENCES "Shipment"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
