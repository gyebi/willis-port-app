-- CreateEnum
CREATE TYPE "ServiceType" AS ENUM ('STANDARD', 'EXPRESS');

-- CreateEnum
CREATE TYPE "GoodsCategory" AS ENUM ('NORMAL', 'SPECIAL');

-- AlterTable
ALTER TABLE "Shipment" ADD COLUMN     "goodsCategory" "GoodsCategory" NOT NULL DEFAULT 'NORMAL',
ADD COLUMN     "serviceType" "ServiceType" NOT NULL DEFAULT 'STANDARD';

-- CreateTable
CREATE TABLE "ShippingRate" (
    "id" TEXT NOT NULL,
    "shippingMode" "ShippingMode" NOT NULL,
    "serviceType" "ServiceType" NOT NULL,
    "goodsCategory" "GoodsCategory" NOT NULL,
    "pricingBasis" "ShipmentPricingBasis" NOT NULL,
    "rateUsd" DECIMAL(65,30) NOT NULL,
    "unit" TEXT NOT NULL,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ShippingRate_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "ShippingRate_shippingMode_idx" ON "ShippingRate"("shippingMode");

-- CreateIndex
CREATE INDEX "ShippingRate_serviceType_idx" ON "ShippingRate"("serviceType");

-- CreateIndex
CREATE INDEX "ShippingRate_goodsCategory_idx" ON "ShippingRate"("goodsCategory");
