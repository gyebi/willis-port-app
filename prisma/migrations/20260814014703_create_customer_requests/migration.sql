-- CreateTable
CREATE TABLE "CustomerRequest" (
    "id" TEXT NOT NULL,
    "requestNumber" TEXT NOT NULL,
    "customerName" TEXT NOT NULL,
    "phone" TEXT NOT NULL,
    "email" TEXT,
    "requestSource" TEXT NOT NULL,
    "shippingMethod" TEXT NOT NULL,
    "goodsCategory" TEXT NOT NULL,
    "weightKg" DECIMAL(65,30),
    "volumeCbm" DECIMAL(65,30),
    "goodsDescription" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CustomerRequest_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "CustomerRequest_requestNumber_key" ON "CustomerRequest"("requestNumber");
