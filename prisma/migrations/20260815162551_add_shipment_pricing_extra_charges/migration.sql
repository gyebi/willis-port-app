-- AlterTable
ALTER TABLE "ShipmentPricing" ADD COLUMN     "deliveryChargeUsd" DECIMAL(65,30) NOT NULL DEFAULT 0,
ADD COLUMN     "documentationChargeUsd" DECIMAL(65,30) NOT NULL DEFAULT 0,
ADD COLUMN     "freightChargeUsd" DECIMAL(65,30) NOT NULL DEFAULT 0,
ADD COLUMN     "handlingChargeUsd" DECIMAL(65,30) NOT NULL DEFAULT 0,
ADD COLUMN     "otherChargeDescription" TEXT,
ADD COLUMN     "otherChargeUsd" DECIMAL(65,30) NOT NULL DEFAULT 0,
ADD COLUMN     "specialHandlingChargeUsd" DECIMAL(65,30) NOT NULL DEFAULT 0;
