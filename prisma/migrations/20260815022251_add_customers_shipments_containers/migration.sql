-- CreateEnum
CREATE TYPE "ShippingMode" AS ENUM ('SEA', 'AIR');

-- CreateEnum
CREATE TYPE "ShipmentStatus" AS ENUM ('RECEIVED', 'ORIGIN', 'LOADING_SCHEDULED', 'IN_TRANSIT', 'CUSTOMS_CLEARANCE', 'WAREHOUSE', 'DELIVERED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "ContainerStatus" AS ENUM ('PLANNING', 'LOADING', 'IN_TRANSIT', 'CUSTOMS_CLEARANCE', 'ARRIVED', 'CLOSED', 'CANCELLED');

-- CreateTable
CREATE TABLE "Customer" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "phone" TEXT,
    "whatsapp" TEXT,
    "email" TEXT,
    "address" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Customer_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Container" (
    "id" TEXT NOT NULL,
    "containerNumber" TEXT NOT NULL,
    "shippingMode" "ShippingMode" NOT NULL,
    "estimatedLoadingDate" TIMESTAMP(3),
    "departureDate" TIMESTAMP(3),
    "eta" TIMESTAMP(3),
    "actualArrivalDate" TIMESTAMP(3),
    "status" "ContainerStatus" NOT NULL DEFAULT 'PLANNING',
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Container_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Shipment" (
    "id" TEXT NOT NULL,
    "shipmentNumber" TEXT NOT NULL,
    "customerId" TEXT NOT NULL,
    "trackingNumber" TEXT,
    "description" TEXT,
    "shippingMode" "ShippingMode" NOT NULL,
    "goodsType" TEXT,
    "weightKg" DECIMAL(65,30),
    "declaredCbm" DECIMAL(65,30),
    "actualCbm" DECIMAL(65,30),
    "chargeableCbm" DECIMAL(65,30),
    "dateReceived" TIMESTAMP(3),
    "estimatedLoadingDate" TIMESTAMP(3),
    "eta" TIMESTAMP(3),
    "status" "ShipmentStatus" NOT NULL DEFAULT 'RECEIVED',
    "containerId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Shipment_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Customer_name_idx" ON "Customer"("name");

-- CreateIndex
CREATE INDEX "Customer_phone_idx" ON "Customer"("phone");

-- CreateIndex
CREATE UNIQUE INDEX "Container_containerNumber_key" ON "Container"("containerNumber");

-- CreateIndex
CREATE UNIQUE INDEX "Shipment_shipmentNumber_key" ON "Shipment"("shipmentNumber");

-- CreateIndex
CREATE INDEX "Shipment_customerId_idx" ON "Shipment"("customerId");

-- CreateIndex
CREATE INDEX "Shipment_trackingNumber_idx" ON "Shipment"("trackingNumber");

-- CreateIndex
CREATE INDEX "Shipment_containerId_idx" ON "Shipment"("containerId");

-- CreateIndex
CREATE INDEX "Shipment_status_idx" ON "Shipment"("status");

-- CreateIndex
CREATE INDEX "Shipment_eta_idx" ON "Shipment"("eta");

-- AddForeignKey
ALTER TABLE "Shipment" ADD CONSTRAINT "Shipment_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "Customer"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Shipment" ADD CONSTRAINT "Shipment_containerId_fkey" FOREIGN KEY ("containerId") REFERENCES "Container"("id") ON DELETE SET NULL ON UPDATE CASCADE;
