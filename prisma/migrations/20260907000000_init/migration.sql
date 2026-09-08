-- CreateSchema
CREATE SCHEMA IF NOT EXISTS "public";

-- CreateEnum
CREATE TYPE "ThemePreference" AS ENUM ('SYSTEM', 'LIGHT', 'DARK');

-- CreateEnum
CREATE TYPE "AccountType" AS ENUM ('CHECKING', 'SAVINGS', 'PAYMENT', 'WALLET', 'CASH', 'CREDIT_CARD', 'INVESTMENT', 'OTHER');

-- CreateEnum
CREATE TYPE "CategoryKind" AS ENUM ('INCOME', 'EXPENSE', 'BOTH');

-- CreateEnum
CREATE TYPE "TransactionKind" AS ENUM ('INCOME', 'EXPENSE', 'REFUND', 'ADJUSTMENT');

-- CreateEnum
CREATE TYPE "EntryDirection" AS ENUM ('CREDIT', 'DEBIT');

-- CreateEnum
CREATE TYPE "TransactionSource" AS ENUM ('MANUAL', 'PDF_IMPORT', 'CSV_IMPORT', 'SYSTEM');

-- CreateEnum
CREATE TYPE "RecordStatus" AS ENUM ('ACTIVE', 'SCHEDULED', 'VOIDED');

-- CreateEnum
CREATE TYPE "TransferStatus" AS ENUM ('ACTIVE', 'VOIDED');

-- CreateEnum
CREATE TYPE "InvoiceStatus" AS ENUM ('OPEN', 'CLOSED', 'PARTIAL', 'PAID', 'OVERDUE', 'VOIDED');

-- CreateEnum
CREATE TYPE "ImportStatus" AS ENUM ('UPLOADING', 'QUEUED', 'EXTRACTING', 'OCR', 'PARSING', 'REVIEW_READY', 'CONFIRMING', 'COMPLETED', 'DUPLICATE_FILE', 'FAILED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "ImportedItemKind" AS ENUM ('PURCHASE', 'PAYMENT', 'REFUND', 'FEE', 'UNKNOWN');

-- CreateEnum
CREATE TYPE "DuplicateStatus" AS ENUM ('NEW', 'EXACT', 'POSSIBLE');

-- CreateEnum
CREATE TYPE "InvestmentType" AS ENUM ('CDB', 'TREASURY', 'STOCK', 'REIT', 'ETF', 'FUND', 'CRYPTO', 'SAVINGS', 'OTHER');

-- CreateEnum
CREATE TYPE "InvestmentTransactionType" AS ENUM ('BUY', 'SELL', 'INCOME', 'FEE', 'ADJUSTMENT');

-- CreateEnum
CREATE TYPE "RecurrenceUnit" AS ENUM ('DAY', 'WEEK', 'MONTH', 'YEAR');

-- CreateEnum
CREATE TYPE "RuleMatcher" AS ENUM ('CONTAINS', 'STARTS_WITH', 'EXACT', 'REGEX');

-- CreateTable
CREATE TABLE "users" (
    "id" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "emailVerified" BOOLEAN NOT NULL DEFAULT false,
    "image" TEXT,
    "defaultCurrency" VARCHAR(3) NOT NULL DEFAULT 'BRL',
    "timezone" TEXT NOT NULL DEFAULT 'America/Sao_Paulo',
    "theme" "ThemePreference" NOT NULL DEFAULT 'SYSTEM',
    "consentedAt" TIMESTAMP(3),
    "onboardingCompletedAt" TIMESTAMP(3),
    "deletionRequestedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "auth_sessions" (
    "id" UUID NOT NULL,
    "token" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "ipAddress" TEXT,
    "userAgent" TEXT,
    "userId" UUID NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "auth_sessions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "auth_accounts" (
    "id" UUID NOT NULL,
    "accountId" TEXT NOT NULL,
    "providerId" TEXT NOT NULL,
    "issuer" TEXT,
    "userId" UUID NOT NULL,
    "accessToken" TEXT,
    "refreshToken" TEXT,
    "idToken" TEXT,
    "accessTokenExpiresAt" TIMESTAMP(3),
    "refreshTokenExpiresAt" TIMESTAMP(3),
    "scope" TEXT,
    "password" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "auth_accounts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "auth_verifications" (
    "id" UUID NOT NULL,
    "identifier" TEXT NOT NULL,
    "value" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "auth_verifications_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "institutions" (
    "id" UUID NOT NULL,
    "userId" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "normalizedName" TEXT NOT NULL,
    "code" TEXT,
    "color" TEXT,
    "icon" TEXT,
    "archivedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "institutions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "financial_accounts" (
    "id" UUID NOT NULL,
    "userId" UUID NOT NULL,
    "institutionId" UUID,
    "name" TEXT NOT NULL,
    "type" "AccountType" NOT NULL,
    "openingBalance" DECIMAL(19,4) NOT NULL DEFAULT 0,
    "openingDate" DATE NOT NULL,
    "currency" VARCHAR(3) NOT NULL DEFAULT 'BRL',
    "color" TEXT,
    "icon" TEXT,
    "archivedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "financial_accounts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "credit_cards" (
    "id" UUID NOT NULL,
    "userId" UUID NOT NULL,
    "accountId" UUID NOT NULL,
    "paymentAccountId" UUID,
    "creditLimit" DECIMAL(19,4) NOT NULL,
    "closingDay" INTEGER NOT NULL,
    "dueDay" INTEGER NOT NULL,
    "brand" TEXT,
    "archivedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "credit_cards_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "categories" (
    "id" UUID NOT NULL,
    "userId" UUID NOT NULL,
    "parentId" UUID,
    "name" TEXT NOT NULL,
    "normalizedName" TEXT NOT NULL,
    "kind" "CategoryKind" NOT NULL DEFAULT 'BOTH',
    "color" TEXT,
    "icon" TEXT,
    "isDefault" BOOLEAN NOT NULL DEFAULT false,
    "archivedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "categories_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "transactions" (
    "id" UUID NOT NULL,
    "userId" UUID NOT NULL,
    "accountId" UUID NOT NULL,
    "categoryId" UUID,
    "invoiceId" UUID,
    "importDraftId" UUID,
    "installmentPlanId" UUID,
    "recurringTransactionId" UUID,
    "description" TEXT NOT NULL,
    "normalizedDescription" TEXT NOT NULL,
    "amount" DECIMAL(19,4) NOT NULL,
    "currency" VARCHAR(3) NOT NULL DEFAULT 'BRL',
    "direction" "EntryDirection" NOT NULL,
    "kind" "TransactionKind" NOT NULL,
    "transactionDate" DATE NOT NULL,
    "note" TEXT,
    "source" "TransactionSource" NOT NULL DEFAULT 'MANUAL',
    "status" "RecordStatus" NOT NULL DEFAULT 'ACTIVE',
    "fingerprint" TEXT NOT NULL,
    "fingerprintVersion" INTEGER NOT NULL DEFAULT 1,
    "installmentNumber" INTEGER,
    "installmentTotal" INTEGER,
    "occurrenceDate" DATE,
    "voidedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "transactions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "transfers" (
    "id" UUID NOT NULL,
    "userId" UUID NOT NULL,
    "sourceAccountId" UUID NOT NULL,
    "destinationAccountId" UUID NOT NULL,
    "amount" DECIMAL(19,4) NOT NULL,
    "currency" VARCHAR(3) NOT NULL DEFAULT 'BRL',
    "transferDate" DATE NOT NULL,
    "description" TEXT NOT NULL,
    "note" TEXT,
    "status" "TransferStatus" NOT NULL DEFAULT 'ACTIVE',
    "voidedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "transfers_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "tags" (
    "id" UUID NOT NULL,
    "userId" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "normalizedName" TEXT NOT NULL,
    "color" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "tags_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "transaction_tags" (
    "transactionId" UUID NOT NULL,
    "tagId" UUID NOT NULL,

    CONSTRAINT "transaction_tags_pkey" PRIMARY KEY ("transactionId","tagId")
);

-- CreateTable
CREATE TABLE "recurring_transactions" (
    "id" UUID NOT NULL,
    "userId" UUID NOT NULL,
    "accountId" UUID NOT NULL,
    "categoryId" UUID,
    "description" TEXT NOT NULL,
    "amount" DECIMAL(19,4) NOT NULL,
    "currency" VARCHAR(3) NOT NULL DEFAULT 'BRL',
    "direction" "EntryDirection" NOT NULL,
    "kind" "TransactionKind" NOT NULL,
    "unit" "RecurrenceUnit" NOT NULL,
    "interval" INTEGER NOT NULL DEFAULT 1,
    "dayOfWeek" INTEGER,
    "dayOfMonth" INTEGER,
    "monthOfYear" INTEGER,
    "startsOn" DATE NOT NULL,
    "endsOn" DATE,
    "nextRunOn" DATE NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "recurring_transactions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "installment_plans" (
    "id" UUID NOT NULL,
    "userId" UUID NOT NULL,
    "creditCardId" UUID NOT NULL,
    "description" TEXT NOT NULL,
    "totalAmount" DECIMAL(19,4) NOT NULL,
    "installmentCount" INTEGER NOT NULL,
    "firstDate" DATE NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "installment_plans_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "invoices" (
    "id" UUID NOT NULL,
    "userId" UUID NOT NULL,
    "creditCardId" UUID NOT NULL,
    "referenceMonth" DATE NOT NULL,
    "closingDate" DATE NOT NULL,
    "dueDate" DATE NOT NULL,
    "status" "InvoiceStatus" NOT NULL DEFAULT 'OPEN',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "invoices_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "invoice_payments" (
    "id" UUID NOT NULL,
    "userId" UUID NOT NULL,
    "invoiceId" UUID NOT NULL,
    "transferId" UUID NOT NULL,
    "amount" DECIMAL(19,4) NOT NULL,
    "paidOn" DATE NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "invoice_payments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "imported_files" (
    "id" UUID NOT NULL,
    "userId" UUID NOT NULL,
    "creditCardId" UUID NOT NULL,
    "displayName" TEXT NOT NULL,
    "storageKey" TEXT NOT NULL,
    "fileHash" TEXT,
    "mimeType" TEXT NOT NULL,
    "sizeBytes" INTEGER NOT NULL,
    "status" "ImportStatus" NOT NULL DEFAULT 'UPLOADING',
    "parserKey" TEXT,
    "parserVersion" TEXT,
    "itemCount" INTEGER NOT NULL DEFAULT 0,
    "selectedCount" INTEGER NOT NULL DEFAULT 0,
    "errorCode" TEXT,
    "errorMessage" TEXT,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "confirmedAt" TIMESTAMP(3),
    "storageDeletedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "imported_files_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "import_drafts" (
    "id" UUID NOT NULL,
    "userId" UUID NOT NULL,
    "importedFileId" UUID NOT NULL,
    "categoryId" UUID,
    "duplicateCandidateId" UUID,
    "kind" "ImportedItemKind" NOT NULL,
    "transactionDate" DATE NOT NULL,
    "description" TEXT NOT NULL,
    "normalizedDescription" TEXT NOT NULL,
    "amount" DECIMAL(19,4) NOT NULL,
    "installmentNumber" INTEGER,
    "installmentTotal" INTEGER,
    "confidence" DECIMAL(5,4) NOT NULL DEFAULT 1,
    "included" BOOLEAN NOT NULL DEFAULT true,
    "wasEdited" BOOLEAN NOT NULL DEFAULT false,
    "fingerprint" TEXT NOT NULL,
    "duplicateStatus" "DuplicateStatus" NOT NULL DEFAULT 'NEW',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "import_drafts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "investments" (
    "id" UUID NOT NULL,
    "userId" UUID NOT NULL,
    "institutionId" UUID NOT NULL,
    "accountId" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "symbol" TEXT,
    "type" "InvestmentType" NOT NULL,
    "currency" VARCHAR(3) NOT NULL DEFAULT 'BRL',
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "investments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "investment_transactions" (
    "id" UUID NOT NULL,
    "userId" UUID NOT NULL,
    "investmentId" UUID NOT NULL,
    "cashAccountId" UUID,
    "type" "InvestmentTransactionType" NOT NULL,
    "quantity" DECIMAL(30,10),
    "unitPrice" DECIMAL(30,10),
    "amount" DECIMAL(19,4) NOT NULL,
    "transactionDate" DATE NOT NULL,
    "note" TEXT,
    "status" "RecordStatus" NOT NULL DEFAULT 'ACTIVE',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "investment_transactions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "investment_valuations" (
    "id" UUID NOT NULL,
    "userId" UUID NOT NULL,
    "investmentId" UUID NOT NULL,
    "value" DECIMAL(19,4) NOT NULL,
    "unitPrice" DECIMAL(30,10),
    "valuedOn" DATE NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "investment_valuations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "categorization_rules" (
    "id" UUID NOT NULL,
    "userId" UUID NOT NULL,
    "categoryId" UUID NOT NULL,
    "pattern" TEXT NOT NULL,
    "matcher" "RuleMatcher" NOT NULL DEFAULT 'CONTAINS',
    "priority" INTEGER NOT NULL DEFAULT 100,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "categorization_rules_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "audit_logs" (
    "id" UUID NOT NULL,
    "userId" UUID NOT NULL,
    "event" TEXT NOT NULL,
    "entityType" TEXT NOT NULL,
    "entityId" TEXT,
    "requestId" TEXT NOT NULL,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "audit_logs_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "users_email_key" ON "users"("email");

-- CreateIndex
CREATE UNIQUE INDEX "auth_sessions_token_key" ON "auth_sessions"("token");

-- CreateIndex
CREATE INDEX "auth_sessions_userId_idx" ON "auth_sessions"("userId");

-- CreateIndex
CREATE INDEX "auth_sessions_expiresAt_idx" ON "auth_sessions"("expiresAt");

-- CreateIndex
CREATE INDEX "auth_accounts_userId_idx" ON "auth_accounts"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "auth_accounts_providerId_accountId_key" ON "auth_accounts"("providerId", "accountId");

-- CreateIndex
CREATE INDEX "auth_verifications_identifier_idx" ON "auth_verifications"("identifier");

-- CreateIndex
CREATE INDEX "auth_verifications_expiresAt_idx" ON "auth_verifications"("expiresAt");

-- CreateIndex
CREATE INDEX "institutions_userId_archivedAt_idx" ON "institutions"("userId", "archivedAt");

-- CreateIndex
CREATE UNIQUE INDEX "institutions_id_userId_key" ON "institutions"("id", "userId");

-- CreateIndex
CREATE UNIQUE INDEX "institutions_userId_normalizedName_key" ON "institutions"("userId", "normalizedName");

-- CreateIndex
CREATE INDEX "financial_accounts_userId_institutionId_idx" ON "financial_accounts"("userId", "institutionId");

-- CreateIndex
CREATE INDEX "financial_accounts_userId_type_archivedAt_idx" ON "financial_accounts"("userId", "type", "archivedAt");

-- CreateIndex
CREATE UNIQUE INDEX "financial_accounts_id_userId_key" ON "financial_accounts"("id", "userId");

-- CreateIndex
CREATE UNIQUE INDEX "credit_cards_accountId_key" ON "credit_cards"("accountId");

-- CreateIndex
CREATE INDEX "credit_cards_userId_archivedAt_idx" ON "credit_cards"("userId", "archivedAt");

-- CreateIndex
CREATE UNIQUE INDEX "credit_cards_id_userId_key" ON "credit_cards"("id", "userId");

-- CreateIndex
CREATE UNIQUE INDEX "credit_cards_accountId_userId_key" ON "credit_cards"("accountId", "userId");

-- CreateIndex
CREATE INDEX "categories_userId_kind_archivedAt_idx" ON "categories"("userId", "kind", "archivedAt");

-- CreateIndex
CREATE UNIQUE INDEX "categories_id_userId_key" ON "categories"("id", "userId");

-- CreateIndex
CREATE UNIQUE INDEX "categories_userId_normalizedName_key" ON "categories"("userId", "normalizedName");

-- CreateIndex
CREATE UNIQUE INDEX "transactions_importDraftId_key" ON "transactions"("importDraftId");

-- CreateIndex
CREATE INDEX "transactions_userId_transactionDate_id_idx" ON "transactions"("userId", "transactionDate", "id");

-- CreateIndex
CREATE INDEX "transactions_userId_accountId_transactionDate_idx" ON "transactions"("userId", "accountId", "transactionDate");

-- CreateIndex
CREATE INDEX "transactions_userId_categoryId_transactionDate_idx" ON "transactions"("userId", "categoryId", "transactionDate");

-- CreateIndex
CREATE INDEX "transactions_userId_source_transactionDate_idx" ON "transactions"("userId", "source", "transactionDate");

-- CreateIndex
CREATE INDEX "transactions_userId_fingerprint_idx" ON "transactions"("userId", "fingerprint");

-- CreateIndex
CREATE UNIQUE INDEX "transactions_id_userId_key" ON "transactions"("id", "userId");

-- CreateIndex
CREATE UNIQUE INDEX "transactions_recurringTransactionId_occurrenceDate_key" ON "transactions"("recurringTransactionId", "occurrenceDate");

-- CreateIndex
CREATE UNIQUE INDEX "transactions_installmentPlanId_installmentNumber_key" ON "transactions"("installmentPlanId", "installmentNumber");

-- CreateIndex
CREATE INDEX "transfers_userId_transferDate_idx" ON "transfers"("userId", "transferDate");

-- CreateIndex
CREATE INDEX "transfers_userId_sourceAccountId_transferDate_idx" ON "transfers"("userId", "sourceAccountId", "transferDate");

-- CreateIndex
CREATE INDEX "transfers_userId_destinationAccountId_transferDate_idx" ON "transfers"("userId", "destinationAccountId", "transferDate");

-- CreateIndex
CREATE UNIQUE INDEX "transfers_id_userId_key" ON "transfers"("id", "userId");

-- CreateIndex
CREATE UNIQUE INDEX "tags_id_userId_key" ON "tags"("id", "userId");

-- CreateIndex
CREATE UNIQUE INDEX "tags_userId_normalizedName_key" ON "tags"("userId", "normalizedName");

-- CreateIndex
CREATE INDEX "recurring_transactions_userId_isActive_nextRunOn_idx" ON "recurring_transactions"("userId", "isActive", "nextRunOn");

-- CreateIndex
CREATE UNIQUE INDEX "recurring_transactions_id_userId_key" ON "recurring_transactions"("id", "userId");

-- CreateIndex
CREATE INDEX "installment_plans_userId_creditCardId_idx" ON "installment_plans"("userId", "creditCardId");

-- CreateIndex
CREATE UNIQUE INDEX "installment_plans_id_userId_key" ON "installment_plans"("id", "userId");

-- CreateIndex
CREATE INDEX "invoices_userId_status_dueDate_idx" ON "invoices"("userId", "status", "dueDate");

-- CreateIndex
CREATE UNIQUE INDEX "invoices_id_userId_key" ON "invoices"("id", "userId");

-- CreateIndex
CREATE UNIQUE INDEX "invoices_creditCardId_referenceMonth_key" ON "invoices"("creditCardId", "referenceMonth");

-- CreateIndex
CREATE UNIQUE INDEX "invoice_payments_transferId_key" ON "invoice_payments"("transferId");

-- CreateIndex
CREATE INDEX "invoice_payments_userId_invoiceId_idx" ON "invoice_payments"("userId", "invoiceId");

-- CreateIndex
CREATE UNIQUE INDEX "invoice_payments_id_userId_key" ON "invoice_payments"("id", "userId");

-- CreateIndex
CREATE UNIQUE INDEX "invoice_payments_transferId_userId_key" ON "invoice_payments"("transferId", "userId");

-- CreateIndex
CREATE UNIQUE INDEX "imported_files_storageKey_key" ON "imported_files"("storageKey");

-- CreateIndex
CREATE INDEX "imported_files_userId_status_createdAt_idx" ON "imported_files"("userId", "status", "createdAt");

-- CreateIndex
CREATE INDEX "imported_files_expiresAt_idx" ON "imported_files"("expiresAt");

-- CreateIndex
CREATE UNIQUE INDEX "imported_files_id_userId_key" ON "imported_files"("id", "userId");

-- CreateIndex
CREATE UNIQUE INDEX "imported_files_userId_fileHash_key" ON "imported_files"("userId", "fileHash");

-- CreateIndex
CREATE INDEX "import_drafts_userId_importedFileId_idx" ON "import_drafts"("userId", "importedFileId");

-- CreateIndex
CREATE INDEX "import_drafts_userId_fingerprint_idx" ON "import_drafts"("userId", "fingerprint");

-- CreateIndex
CREATE UNIQUE INDEX "import_drafts_id_userId_key" ON "import_drafts"("id", "userId");

-- CreateIndex
CREATE INDEX "investments_userId_institutionId_idx" ON "investments"("userId", "institutionId");

-- CreateIndex
CREATE INDEX "investments_userId_type_isActive_idx" ON "investments"("userId", "type", "isActive");

-- CreateIndex
CREATE UNIQUE INDEX "investments_id_userId_key" ON "investments"("id", "userId");

-- CreateIndex
CREATE INDEX "investment_transactions_userId_investmentId_transactionDate_idx" ON "investment_transactions"("userId", "investmentId", "transactionDate");

-- CreateIndex
CREATE UNIQUE INDEX "investment_transactions_id_userId_key" ON "investment_transactions"("id", "userId");

-- CreateIndex
CREATE INDEX "investment_valuations_userId_valuedOn_idx" ON "investment_valuations"("userId", "valuedOn");

-- CreateIndex
CREATE UNIQUE INDEX "investment_valuations_investmentId_valuedOn_key" ON "investment_valuations"("investmentId", "valuedOn");

-- CreateIndex
CREATE UNIQUE INDEX "investment_valuations_id_userId_key" ON "investment_valuations"("id", "userId");

-- CreateIndex
CREATE INDEX "categorization_rules_userId_isActive_priority_idx" ON "categorization_rules"("userId", "isActive", "priority");

-- CreateIndex
CREATE UNIQUE INDEX "categorization_rules_id_userId_key" ON "categorization_rules"("id", "userId");

-- CreateIndex
CREATE INDEX "audit_logs_userId_createdAt_idx" ON "audit_logs"("userId", "createdAt");

-- CreateIndex
CREATE INDEX "audit_logs_requestId_idx" ON "audit_logs"("requestId");

-- CreateIndex
CREATE UNIQUE INDEX "audit_logs_id_userId_key" ON "audit_logs"("id", "userId");

-- AddForeignKey
ALTER TABLE "auth_sessions" ADD CONSTRAINT "auth_sessions_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "auth_accounts" ADD CONSTRAINT "auth_accounts_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "institutions" ADD CONSTRAINT "institutions_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "financial_accounts" ADD CONSTRAINT "financial_accounts_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "financial_accounts" ADD CONSTRAINT "financial_accounts_institutionId_userId_fkey" FOREIGN KEY ("institutionId", "userId") REFERENCES "institutions"("id", "userId") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "credit_cards" ADD CONSTRAINT "credit_cards_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "credit_cards" ADD CONSTRAINT "credit_cards_accountId_userId_fkey" FOREIGN KEY ("accountId", "userId") REFERENCES "financial_accounts"("id", "userId") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "credit_cards" ADD CONSTRAINT "credit_cards_paymentAccountId_userId_fkey" FOREIGN KEY ("paymentAccountId", "userId") REFERENCES "financial_accounts"("id", "userId") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "categories" ADD CONSTRAINT "categories_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "categories" ADD CONSTRAINT "categories_parentId_userId_fkey" FOREIGN KEY ("parentId", "userId") REFERENCES "categories"("id", "userId") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "transactions" ADD CONSTRAINT "transactions_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "transactions" ADD CONSTRAINT "transactions_accountId_userId_fkey" FOREIGN KEY ("accountId", "userId") REFERENCES "financial_accounts"("id", "userId") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "transactions" ADD CONSTRAINT "transactions_categoryId_userId_fkey" FOREIGN KEY ("categoryId", "userId") REFERENCES "categories"("id", "userId") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "transactions" ADD CONSTRAINT "transactions_invoiceId_userId_fkey" FOREIGN KEY ("invoiceId", "userId") REFERENCES "invoices"("id", "userId") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "transactions" ADD CONSTRAINT "transactions_importDraftId_fkey" FOREIGN KEY ("importDraftId") REFERENCES "import_drafts"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "transactions" ADD CONSTRAINT "transactions_installmentPlanId_userId_fkey" FOREIGN KEY ("installmentPlanId", "userId") REFERENCES "installment_plans"("id", "userId") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "transactions" ADD CONSTRAINT "transactions_recurringTransactionId_userId_fkey" FOREIGN KEY ("recurringTransactionId", "userId") REFERENCES "recurring_transactions"("id", "userId") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "transfers" ADD CONSTRAINT "transfers_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "transfers" ADD CONSTRAINT "transfers_sourceAccountId_userId_fkey" FOREIGN KEY ("sourceAccountId", "userId") REFERENCES "financial_accounts"("id", "userId") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "transfers" ADD CONSTRAINT "transfers_destinationAccountId_userId_fkey" FOREIGN KEY ("destinationAccountId", "userId") REFERENCES "financial_accounts"("id", "userId") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tags" ADD CONSTRAINT "tags_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "transaction_tags" ADD CONSTRAINT "transaction_tags_transactionId_fkey" FOREIGN KEY ("transactionId") REFERENCES "transactions"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "transaction_tags" ADD CONSTRAINT "transaction_tags_tagId_fkey" FOREIGN KEY ("tagId") REFERENCES "tags"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "recurring_transactions" ADD CONSTRAINT "recurring_transactions_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "recurring_transactions" ADD CONSTRAINT "recurring_transactions_accountId_userId_fkey" FOREIGN KEY ("accountId", "userId") REFERENCES "financial_accounts"("id", "userId") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "recurring_transactions" ADD CONSTRAINT "recurring_transactions_categoryId_userId_fkey" FOREIGN KEY ("categoryId", "userId") REFERENCES "categories"("id", "userId") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "installment_plans" ADD CONSTRAINT "installment_plans_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "installment_plans" ADD CONSTRAINT "installment_plans_creditCardId_userId_fkey" FOREIGN KEY ("creditCardId", "userId") REFERENCES "credit_cards"("id", "userId") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "invoices" ADD CONSTRAINT "invoices_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "invoices" ADD CONSTRAINT "invoices_creditCardId_userId_fkey" FOREIGN KEY ("creditCardId", "userId") REFERENCES "credit_cards"("id", "userId") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "invoice_payments" ADD CONSTRAINT "invoice_payments_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "invoice_payments" ADD CONSTRAINT "invoice_payments_invoiceId_userId_fkey" FOREIGN KEY ("invoiceId", "userId") REFERENCES "invoices"("id", "userId") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "invoice_payments" ADD CONSTRAINT "invoice_payments_transferId_userId_fkey" FOREIGN KEY ("transferId", "userId") REFERENCES "transfers"("id", "userId") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "imported_files" ADD CONSTRAINT "imported_files_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "imported_files" ADD CONSTRAINT "imported_files_creditCardId_userId_fkey" FOREIGN KEY ("creditCardId", "userId") REFERENCES "credit_cards"("id", "userId") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "import_drafts" ADD CONSTRAINT "import_drafts_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "import_drafts" ADD CONSTRAINT "import_drafts_importedFileId_userId_fkey" FOREIGN KEY ("importedFileId", "userId") REFERENCES "imported_files"("id", "userId") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "import_drafts" ADD CONSTRAINT "import_drafts_categoryId_userId_fkey" FOREIGN KEY ("categoryId", "userId") REFERENCES "categories"("id", "userId") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "import_drafts" ADD CONSTRAINT "import_drafts_duplicateCandidateId_userId_fkey" FOREIGN KEY ("duplicateCandidateId", "userId") REFERENCES "transactions"("id", "userId") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "investments" ADD CONSTRAINT "investments_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "investments" ADD CONSTRAINT "investments_institutionId_userId_fkey" FOREIGN KEY ("institutionId", "userId") REFERENCES "institutions"("id", "userId") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "investments" ADD CONSTRAINT "investments_accountId_userId_fkey" FOREIGN KEY ("accountId", "userId") REFERENCES "financial_accounts"("id", "userId") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "investment_transactions" ADD CONSTRAINT "investment_transactions_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "investment_transactions" ADD CONSTRAINT "investment_transactions_investmentId_userId_fkey" FOREIGN KEY ("investmentId", "userId") REFERENCES "investments"("id", "userId") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "investment_transactions" ADD CONSTRAINT "investment_transactions_cashAccountId_userId_fkey" FOREIGN KEY ("cashAccountId", "userId") REFERENCES "financial_accounts"("id", "userId") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "investment_valuations" ADD CONSTRAINT "investment_valuations_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "investment_valuations" ADD CONSTRAINT "investment_valuations_investmentId_userId_fkey" FOREIGN KEY ("investmentId", "userId") REFERENCES "investments"("id", "userId") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "categorization_rules" ADD CONSTRAINT "categorization_rules_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "categorization_rules" ADD CONSTRAINT "categorization_rules_categoryId_userId_fkey" FOREIGN KEY ("categoryId", "userId") REFERENCES "categories"("id", "userId") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "audit_logs" ADD CONSTRAINT "audit_logs_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Financial integrity constraints not expressible in Prisma schema.
ALTER TABLE "transactions" ADD CONSTRAINT "transactions_amount_positive" CHECK ("amount" > 0);
ALTER TABLE "transactions" ADD CONSTRAINT "transactions_installments_valid" CHECK (
  ("installmentNumber" IS NULL AND "installmentTotal" IS NULL)
  OR ("installmentNumber" >= 1 AND "installmentTotal" >= "installmentNumber")
);
ALTER TABLE "transfers" ADD CONSTRAINT "transfers_amount_positive" CHECK ("amount" > 0);
ALTER TABLE "transfers" ADD CONSTRAINT "transfers_distinct_accounts" CHECK ("sourceAccountId" <> "destinationAccountId");
ALTER TABLE "credit_cards" ADD CONSTRAINT "credit_cards_limit_positive" CHECK ("creditLimit" > 0);
ALTER TABLE "credit_cards" ADD CONSTRAINT "credit_cards_days_valid" CHECK ("closingDay" BETWEEN 1 AND 28 AND "dueDay" BETWEEN 1 AND 28);
ALTER TABLE "installment_plans" ADD CONSTRAINT "installment_plans_valid" CHECK ("totalAmount" > 0 AND "installmentCount" BETWEEN 1 AND 120);
ALTER TABLE "import_drafts" ADD CONSTRAINT "import_drafts_valid" CHECK ("amount" > 0 AND "confidence" BETWEEN 0 AND 1);
ALTER TABLE "investment_transactions" ADD CONSTRAINT "investment_transactions_amount_positive" CHECK ("amount" > 0);
ALTER TABLE "investment_valuations" ADD CONSTRAINT "investment_valuations_value_nonnegative" CHECK ("value" >= 0);
ALTER TABLE "recurring_transactions" ADD CONSTRAINT "recurring_transactions_interval_positive" CHECK ("interval" > 0);

CREATE EXTENSION IF NOT EXISTS pg_trgm;
CREATE INDEX "transactions_description_trgm_idx" ON "transactions" USING GIN ("normalizedDescription" gin_trgm_ops);

-- Tenant isolation. The application sets app.current_user_id with SET LOCAL in every domain transaction.
DO $$
DECLARE table_name text;
BEGIN
  FOREACH table_name IN ARRAY ARRAY[
    'institutions', 'financial_accounts', 'credit_cards', 'categories', 'transactions',
    'transfers', 'tags', 'recurring_transactions', 'installment_plans', 'invoices',
    'invoice_payments', 'imported_files', 'import_drafts', 'investments',
    'investment_transactions', 'investment_valuations', 'categorization_rules', 'audit_logs'
  ]
  LOOP
    EXECUTE format('ALTER TABLE %I ENABLE ROW LEVEL SECURITY', table_name);
    EXECUTE format('ALTER TABLE %I FORCE ROW LEVEL SECURITY', table_name);
    EXECUTE format(
      'CREATE POLICY tenant_isolation ON %I USING ("userId" = NULLIF(current_setting(''app.current_user_id'', true), '''')::uuid) WITH CHECK ("userId" = NULLIF(current_setting(''app.current_user_id'', true), '''')::uuid)',
      table_name
    );
  END LOOP;
END $$;

ALTER TABLE "transaction_tags" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "transaction_tags" FORCE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation ON "transaction_tags"
USING (EXISTS (
  SELECT 1 FROM "transactions" t
  WHERE t."id" = "transaction_tags"."transactionId"
    AND t."userId" = NULLIF(current_setting('app.current_user_id', true), '')::uuid
))
WITH CHECK (EXISTS (
  SELECT 1 FROM "transactions" t
  WHERE t."id" = "transaction_tags"."transactionId"
    AND t."userId" = NULLIF(current_setting('app.current_user_id', true), '')::uuid
));
