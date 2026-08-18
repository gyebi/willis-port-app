/*
  Warnings:

  - A unique constraint covering the columns `[shippingMode,serviceType,goodsCategory]` on the table `ShippingRate` will be added. If there are existing duplicate values, this will fail.

*/
-- CreateIndex
CREATE UNIQUE INDEX "ShippingRate_shippingMode_serviceType_goodsCategory_key" ON "ShippingRate"("shippingMode", "serviceType", "goodsCategory");
