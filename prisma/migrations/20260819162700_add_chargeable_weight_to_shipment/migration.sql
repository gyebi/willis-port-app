/*
  Warnings:

  - You are about to drop the column `weightKg` on the `Shipment` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "Shipment"
ADD COLUMN "chargeableWeightKg" DECIMAL(65,30);
