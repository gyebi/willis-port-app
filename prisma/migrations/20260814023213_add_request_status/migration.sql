-- CreateEnum
CREATE TYPE "RequestStatus" AS ENUM ('NEW', 'INVOICED', 'AWAITING_PAYMENT', 'PAID', 'CANCELLED');

-- AlterTable
ALTER TABLE "CustomerRequest" ADD COLUMN     "status" "RequestStatus" NOT NULL DEFAULT 'NEW';
