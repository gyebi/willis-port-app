-- CreateEnum
CREATE TYPE "InvoiceDeliveryChannel" AS ENUM ('EMAIL', 'WHATSAPP', 'SMS', 'MAIL', 'PRINT');

-- CreateEnum
CREATE TYPE "InvoiceDeliveryStatus" AS ENUM ('PENDING', 'INITIATED', 'SENT', 'FAILED', 'PRINT_REQUESTED', 'MAIL_PREPARED');

-- CreateEnum
CREATE TYPE "PaymentMethod" AS ENUM ('CASH', 'BANK_TRANSFER', 'MOBILE_MONEY', 'CARD', 'OTHER');

-- CreateTable
CREATE TABLE "InvoiceDocument" (
    "id" TEXT NOT NULL,
    "invoiceId" TEXT NOT NULL,
    "storagePath" TEXT NOT NULL,
    "fileName" TEXT NOT NULL,
    "generatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "version" INTEGER NOT NULL DEFAULT 1,
    "isIssued" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "InvoiceDocument_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "InvoiceDelivery" (
    "id" TEXT NOT NULL,
    "invoiceId" TEXT NOT NULL,
    "invoiceDocumentId" TEXT,
    "channel" "InvoiceDeliveryChannel" NOT NULL,
    "recipient" TEXT,
    "status" "InvoiceDeliveryStatus" NOT NULL,
    "sentAt" TIMESTAMP(3),
    "failedAt" TIMESTAMP(3),
    "failureReason" TEXT,
    "providerMessageId" TEXT,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "InvoiceDelivery_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Payment" (
    "id" TEXT NOT NULL,
    "invoiceId" TEXT NOT NULL,
    "amountGhs" DECIMAL(65,30) NOT NULL,
    "method" "PaymentMethod" NOT NULL,
    "reference" TEXT,
    "notes" TEXT,
    "paidAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Payment_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "InvoiceDocument_invoiceId_idx" ON "InvoiceDocument"("invoiceId");

-- CreateIndex
CREATE INDEX "InvoiceDelivery_invoiceId_idx" ON "InvoiceDelivery"("invoiceId");

-- CreateIndex
CREATE INDEX "InvoiceDelivery_invoiceDocumentId_idx" ON "InvoiceDelivery"("invoiceDocumentId");

-- CreateIndex
CREATE INDEX "InvoiceDelivery_channel_idx" ON "InvoiceDelivery"("channel");

-- CreateIndex
CREATE INDEX "InvoiceDelivery_status_idx" ON "InvoiceDelivery"("status");

-- CreateIndex
CREATE INDEX "Payment_invoiceId_idx" ON "Payment"("invoiceId");

-- CreateIndex
CREATE INDEX "Payment_method_idx" ON "Payment"("method");

-- AddForeignKey
ALTER TABLE "InvoiceDocument" ADD CONSTRAINT "InvoiceDocument_invoiceId_fkey" FOREIGN KEY ("invoiceId") REFERENCES "Invoice"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "InvoiceDelivery" ADD CONSTRAINT "InvoiceDelivery_invoiceId_fkey" FOREIGN KEY ("invoiceId") REFERENCES "Invoice"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "InvoiceDelivery" ADD CONSTRAINT "InvoiceDelivery_invoiceDocumentId_fkey" FOREIGN KEY ("invoiceDocumentId") REFERENCES "InvoiceDocument"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Payment" ADD CONSTRAINT "Payment_invoiceId_fkey" FOREIGN KEY ("invoiceId") REFERENCES "Invoice"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
