/*
  Warnings:

  - The `type` column on the `Wallet` table would be dropped and recreated. This will lead to data loss if there is data in the column.

*/
-- CreateEnum
CREATE TYPE "WalletType" AS ENUM ('INSTRUCTOR', 'STUDENT', 'PLATFORM_COMMISSION', 'PLATFORM_TAX', 'PLATFORM_FEES', 'MODULE_LMS', 'MODULE_LIMS', 'MODULE_COLLEGE', 'MODULE_HRMS');

-- AlterTable
ALTER TABLE "Wallet" ADD COLUMN     "metadata" JSONB,
ADD COLUMN     "moduleId" TEXT,
DROP COLUMN "type",
ADD COLUMN     "type" "WalletType" NOT NULL DEFAULT 'INSTRUCTOR';

-- CreateIndex
CREATE INDEX "PaymentGateway_type_idx" ON "PaymentGateway"("type");

-- CreateIndex
CREATE INDEX "PaymentGateway_isActive_idx" ON "PaymentGateway"("isActive");

-- CreateIndex
CREATE INDEX "Payout_instructorId_idx" ON "Payout"("instructorId");

-- CreateIndex
CREATE INDEX "Payout_status_idx" ON "Payout"("status");

-- CreateIndex
CREATE INDEX "Transaction_type_idx" ON "Transaction"("type");

-- CreateIndex
CREATE INDEX "Transaction_status_idx" ON "Transaction"("status");

-- CreateIndex
CREATE INDEX "Wallet_userId_idx" ON "Wallet"("userId");

-- CreateIndex
CREATE INDEX "Wallet_type_idx" ON "Wallet"("type");

-- CreateIndex
CREATE INDEX "Wallet_moduleId_idx" ON "Wallet"("moduleId");
