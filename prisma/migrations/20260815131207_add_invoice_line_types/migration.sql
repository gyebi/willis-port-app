CREATE TYPE "InvoiceLineType" AS ENUM (
  'SHIPMENT',
  'FREIGHT',
  'HANDLING',
  'DOCUMENTATION',
  'SPECIAL_HANDLING',
  'DELIVERY',
  'OTHER'
);

ALTER TABLE "InvoiceLine"
ADD COLUMN "lineType" "InvoiceLineType";

UPDATE "InvoiceLine"
SET "lineType" = 'SHIPMENT'
WHERE "lineType" IS NULL;

ALTER TABLE "InvoiceLine"
ALTER COLUMN "lineType" SET NOT NULL;