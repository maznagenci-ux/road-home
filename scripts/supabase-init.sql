-- CreateSchema
CREATE SCHEMA IF NOT EXISTS "public";

-- CreateEnum
CREATE TYPE "Locale" AS ENUM ('ku', 'ar', 'en');

-- CreateEnum
CREATE TYPE "UserRole" AS ENUM ('SUPER_ADMIN', 'ACCOUNTANT', 'SALESPERSON', 'SITE_SUPERVISOR', 'VIEW_ONLY');

-- CreateEnum
CREATE TYPE "PermissionKey" AS ENUM ('VIEW_DASHBOARD', 'VIEW_ACCOUNTING', 'VIEW_PROJECTS', 'VIEW_PROPERTIES', 'VIEW_CONTRACTS', 'VIEW_RENTALS', 'VIEW_ANKET', 'VIEW_REPORTS', 'VIEW_USERS', 'VIEW_CASH_VAULT', 'VIEW_PAYABLES', 'VIEW_CONSTRUCTION_COST', 'VIEW_INVENTORY', 'ADD_VOUCHERS', 'EDIT_TRANSACTIONS', 'REVERSE_VOUCHERS', 'CHANGE_FX_RATE', 'MANAGE_CONTRACTS', 'MANAGE_RENTALS', 'MANAGE_ANKET', 'MANAGE_PROJECTS', 'MANAGE_USERS', 'EXPORT_FINANCE', 'APPROVE_FINANCE', 'MANAGE_PROJECT_BUDGET', 'MANAGE_INVENTORY', 'ISSUE_MATERIALS', 'APPROVE_WASTE');

-- CreateEnum
CREATE TYPE "ContractStatus" AS ENUM ('DRAFT', 'ACTIVE', 'COMPLETED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "ContractKind" AS ENUM ('SALE', 'PURCHASE');

-- CreateEnum
CREATE TYPE "ContractCurrency" AS ENUM ('IQD', 'USD');

-- CreateEnum
CREATE TYPE "PropertyAssetType" AS ENUM ('HOUSE', 'APARTMENT', 'LAND', 'SHOP', 'BUILDING');

-- CreateEnum
CREATE TYPE "LeaseStatus" AS ENUM ('ACTIVE', 'EXPIRED', 'TERMINATED');

-- CreateEnum
CREATE TYPE "DepositStatus" AS ENUM ('HELD', 'PARTIAL_RETURNED', 'RETURNED', 'FORFEITED');

-- CreateEnum
CREATE TYPE "InstallmentStatus" AS ENUM ('PENDING', 'PAID', 'OVERDUE', 'CANCELLED');

-- CreateEnum
CREATE TYPE "ReceiptType" AS ENUM ('PAYMENT', 'INCOME', 'EXPENSE');

-- CreateEnum
CREATE TYPE "ProjectStatus" AS ENUM ('IN_CONSTRUCTION', 'SOLD', 'FINISHED');

-- CreateEnum
CREATE TYPE "ExpenseCategory" AS ENUM ('STEEL', 'CEMENT', 'LABOR', 'PERMITS', 'MATERIALS', 'EQUIPMENT', 'UTILITIES', 'OTHER', 'OFFICE_RENT', 'OFFICE_UTILITIES', 'OFFICE_SUPPLIES', 'OFFICE_TRANSPORT', 'OFFICE_COMM', 'OTHER_OFFICE', 'SALARY', 'BONUS', 'ALLOWANCE');

-- CreateEnum
CREATE TYPE "VoucherAccountType" AS ENUM ('EXPENSE', 'VENDOR_PAYMENT', 'BUYER_PAYMENT', 'RECEIVABLE', 'PAYABLE', 'RENTAL_INCOME', 'OFFICE_EXPENSE', 'EMPLOYEE_SALARY');

-- CreateEnum
CREATE TYPE "PaymentMethod" AS ENUM ('CASH_VAULT', 'CREDIT');

-- CreateEnum
CREATE TYPE "VoucherStatus" AS ENUM ('POSTED', 'REVERSED');

-- CreateEnum
CREATE TYPE "ReceiptPurpose" AS ENUM ('GENERAL', 'RENT', 'SECURITY_DEPOSIT');

-- CreateEnum
CREATE TYPE "AnketKind" AS ENUM ('SALE', 'RENT');

-- CreateEnum
CREATE TYPE "AnketStatus" AS ENUM ('DRAFT', 'SUBMITTED', 'APPROVED');

-- CreateEnum
CREATE TYPE "AccountClass" AS ENUM ('ASSET', 'LIABILITY', 'EQUITY', 'INCOME', 'EXPENSE');

-- CreateEnum
CREATE TYPE "LedgerTxnType" AS ENUM ('INCOME', 'EXPENSE', 'CUSTOMER_PAYMENT', 'CUSTOMER_REFUND', 'SUPPLIER_PAYMENT', 'CUSTOMER_DEBT', 'SUPPLIER_DEBT', 'PROPERTY_PURCHASE', 'PROPERTY_SALE', 'PROPERTY_RENTAL', 'INSTALLMENT', 'COMMISSION', 'EMPLOYEE_COMMISSION', 'INVESTMENT', 'OWNER_CAPITAL', 'OWNER_WITHDRAWAL', 'CASH_DEPOSIT', 'CASH_WITHDRAWAL', 'BANK_DEPOSIT', 'BANK_WITHDRAWAL', 'TRANSFER', 'ADJUSTMENT', 'SALARY', 'INVENTORY_PURCHASE', 'INVENTORY_ISSUE', 'INVENTORY_WASTE', 'INVENTORY_ADJUST', 'INVENTORY_TRANSFER');

-- CreateEnum
CREATE TYPE "MoneyAccountKind" AS ENUM ('CASH', 'BANK');

-- CreateEnum
CREATE TYPE "LedgerCurrency" AS ENUM ('IQD', 'USD', 'EUR');

-- CreateEnum
CREATE TYPE "LedgerPayMethod" AS ENUM ('CASH', 'BANK', 'CREDIT', 'TRANSFER', 'OTHER');

-- CreateEnum
CREATE TYPE "ConstructionProjectStatus" AS ENUM ('ACTIVE', 'ON_HOLD', 'CLOSED');

-- CreateEnum
CREATE TYPE "MaterialUnit" AS ENUM ('KG', 'TON', 'BAG', 'M3', 'M2', 'M', 'PCS', 'LITER', 'SET', 'OTHER');

-- CreateEnum
CREATE TYPE "InventoryTxnKind" AS ENUM ('PURCHASE', 'RECEIVE', 'TRANSFER', 'ISSUE', 'RETURN', 'WASTE', 'ADJUSTMENT');

-- CreateEnum
CREATE TYPE "WasteReason" AS ENUM ('DAMAGE', 'CONSTRUCTION_WASTE', 'INCORRECT_MEASUREMENT', 'THEFT_LOSS', 'EXPIRED', 'OTHER');

-- CreateEnum
CREATE TYPE "WasteApprovalStatus" AS ENUM ('PENDING', 'APPROVED', 'REJECTED', 'NOT_REQUIRED');

-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL,
    "phone" TEXT NOT NULL,
    "passwordHash" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "role" "UserRole" NOT NULL DEFAULT 'VIEW_ONLY',
    "locale" "Locale" NOT NULL DEFAULT 'ku',
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PasswordResetToken" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "tokenHash" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "usedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PasswordResetToken_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "LoginOtp" (
    "id" TEXT NOT NULL,
    "phone" TEXT NOT NULL,
    "codeHash" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "attempts" INTEGER NOT NULL DEFAULT 0,
    "consumedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "LoginOtp_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "UserPermission" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "key" "PermissionKey" NOT NULL,
    "granted" BOOLEAN NOT NULL DEFAULT true,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "UserPermission_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ActivityLog" (
    "id" TEXT NOT NULL,
    "userId" TEXT,
    "userName" TEXT NOT NULL,
    "action" TEXT NOT NULL,
    "projectCode" TEXT,
    "amountIqd" DOUBLE PRECISION,
    "meta" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ActivityLog_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Owner" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "phone" TEXT,
    "email" TEXT,
    "address" TEXT,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Owner_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Customer" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "phone" TEXT,
    "email" TEXT,
    "address" TEXT,
    "nationalId" TEXT,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Customer_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Supplier" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "phone" TEXT,
    "email" TEXT,
    "address" TEXT,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Supplier_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Property" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "location" TEXT,
    "description" TEXT,
    "ownerId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Property_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "House" (
    "id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "unitNumber" TEXT,
    "area" DOUBLE PRECISION,
    "price" DOUBLE PRECISION,
    "budgetIqd" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "location" TEXT,
    "status" "ProjectStatus" NOT NULL DEFAULT 'IN_CONSTRUCTION',
    "description" TEXT,
    "targetFinishAt" TIMESTAMP(3),
    "propertyId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "House_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Contract" (
    "id" TEXT NOT NULL,
    "contractNo" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "kind" "ContractKind" NOT NULL DEFAULT 'SALE',
    "propertyType" "PropertyAssetType" NOT NULL DEFAULT 'HOUSE',
    "description" TEXT,
    "currency" "ContractCurrency" NOT NULL DEFAULT 'IQD',
    "exchangeRate" DOUBLE PRECISION NOT NULL DEFAULT 150000,
    "totalAmount" DOUBLE PRECISION NOT NULL,
    "totalAmountUsd" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "downPayment" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "downPaymentUsd" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "downPaymentHeld" BOOLEAN NOT NULL DEFAULT true,
    "areaSqm" DOUBLE PRECISION,
    "cancelFeeIqd" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "dailyPenaltyIqd" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "commissionSellerIqd" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "commissionBuyerIqd" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "status" "ContractStatus" NOT NULL DEFAULT 'DRAFT',
    "isExternal" BOOLEAN NOT NULL DEFAULT false,
    "tapuCode" TEXT,
    "buyerName" TEXT,
    "buyerPhone" TEXT,
    "buyerIdNo" TEXT,
    "sellerName" TEXT,
    "sellerPhone" TEXT,
    "sellerIdNo" TEXT,
    "witness1Name" TEXT,
    "witness1IdNo" TEXT,
    "witness1Phone" TEXT,
    "witness2Name" TEXT,
    "witness2IdNo" TEXT,
    "witness2Phone" TEXT,
    "guarantorName" TEXT,
    "guarantorPhone" TEXT,
    "lawyerName" TEXT,
    "lawyerPhone" TEXT,
    "legalConditions" TEXT,
    "notes" TEXT,
    "staffNote" TEXT,
    "organizerName" TEXT,
    "showOrganizer" BOOLEAN NOT NULL DEFAULT true,
    "dealEmployeeId" TEXT,
    "dealEmployeeName" TEXT,
    "startDate" TIMESTAMP(3),
    "endDate" TIMESTAMP(3),
    "handoverDate" TIMESTAMP(3),
    "signingDate" TIMESTAMP(3),
    "remainingDueDate" TIMESTAMP(3),
    "customerId" TEXT,
    "houseId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Contract_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Lease" (
    "id" TEXT NOT NULL,
    "leaseNo" TEXT NOT NULL,
    "propertyCode" TEXT NOT NULL,
    "propertyName" TEXT,
    "landlordName" TEXT,
    "landlordPhone" TEXT,
    "tenantName" TEXT NOT NULL,
    "tenantPhone" TEXT,
    "witness1Name" TEXT,
    "witness1Phone" TEXT,
    "witness2Name" TEXT,
    "witness2Phone" TEXT,
    "guarantorName" TEXT,
    "guarantorPhone" TEXT,
    "propertyType" "PropertyAssetType" NOT NULL DEFAULT 'HOUSE',
    "areaSqm" DOUBLE PRECISION,
    "rentPurpose" TEXT,
    "startDate" TIMESTAMP(3) NOT NULL,
    "endDate" TIMESTAMP(3) NOT NULL,
    "durationMonths" INTEGER,
    "signingDate" TIMESTAMP(3),
    "currency" "ContractCurrency" NOT NULL DEFAULT 'IQD',
    "exchangeRate" DOUBLE PRECISION NOT NULL DEFAULT 150000,
    "monthlyRentIqd" DOUBLE PRECISION NOT NULL,
    "advancePaymentIqd" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "securityDepositIqd" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "dailyPenaltyIqd" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "cancelFeeIqd" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "lateFeeIqd" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "commissionTenantIqd" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "commissionLandlordIqd" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "depositStatus" "DepositStatus" NOT NULL DEFAULT 'HELD',
    "status" "LeaseStatus" NOT NULL DEFAULT 'ACTIVE',
    "propertyStatusNote" TEXT,
    "notes" TEXT,
    "staffNote" TEXT,
    "organizerName" TEXT,
    "showOrganizer" BOOLEAN NOT NULL DEFAULT true,
    "dealEmployeeId" TEXT,
    "dealEmployeeName" TEXT,
    "paymentSchedule" TEXT,
    "houseId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Lease_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RentPayment" (
    "id" TEXT NOT NULL,
    "leaseId" TEXT NOT NULL,
    "periodLabel" TEXT NOT NULL,
    "amountIqd" DOUBLE PRECISION NOT NULL,
    "voucherId" TEXT,
    "paidAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "RentPayment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Installment" (
    "id" TEXT NOT NULL,
    "amount" DOUBLE PRECISION NOT NULL,
    "dueDate" TIMESTAMP(3) NOT NULL,
    "paidDate" TIMESTAMP(3),
    "status" "InstallmentStatus" NOT NULL DEFAULT 'PENDING',
    "notes" TEXT,
    "contractId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Installment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Receipt" (
    "id" TEXT NOT NULL,
    "receiptNo" TEXT NOT NULL,
    "type" "ReceiptType" NOT NULL DEFAULT 'PAYMENT',
    "partyName" TEXT NOT NULL DEFAULT '',
    "currency" "ContractCurrency" NOT NULL DEFAULT 'IQD',
    "amount" DOUBLE PRECISION NOT NULL,
    "totalAmount" DOUBLE PRECISION,
    "remainingAmount" DOUBLE PRECISION,
    "description" TEXT,
    "issuedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "contractId" TEXT,
    "leaseId" TEXT,
    "purpose" "ReceiptPurpose" NOT NULL DEFAULT 'GENERAL',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Receipt_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Anket" (
    "id" TEXT NOT NULL,
    "anketNo" TEXT NOT NULL,
    "kind" "AnketKind" NOT NULL DEFAULT 'RENT',
    "status" "AnketStatus" NOT NULL DEFAULT 'DRAFT',
    "branch" TEXT NOT NULL DEFAULT 'بارەگای سەرەکی',
    "issuedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "securityStationName" TEXT NOT NULL DEFAULT '',
    "location" TEXT NOT NULL DEFAULT '',
    "propertyType" "PropertyAssetType" NOT NULL DEFAULT 'APARTMENT',
    "propertyNo" TEXT NOT NULL DEFAULT '',
    "propertyName" TEXT NOT NULL DEFAULT '',
    "projectName" TEXT NOT NULL DEFAULT '',
    "buildingNo" TEXT NOT NULL DEFAULT '',
    "floorNo" TEXT NOT NULL DEFAULT '',
    "unitNo" TEXT NOT NULL DEFAULT '',
    "propertyStatus" TEXT NOT NULL DEFAULT 'empty',
    "party1Name" TEXT NOT NULL DEFAULT '',
    "party1Phone" TEXT NOT NULL DEFAULT '',
    "party1Address" TEXT NOT NULL DEFAULT '',
    "party1Nationality" TEXT NOT NULL DEFAULT '',
    "party1Occupation" TEXT NOT NULL DEFAULT '',
    "party1Code" TEXT NOT NULL DEFAULT '',
    "party2Name" TEXT NOT NULL DEFAULT '',
    "party2Phone" TEXT NOT NULL DEFAULT '',
    "party2Address" TEXT NOT NULL DEFAULT '',
    "party2Nationality" TEXT NOT NULL DEFAULT '',
    "party2Occupation" TEXT NOT NULL DEFAULT '',
    "party2Origin" TEXT NOT NULL DEFAULT '',
    "documents" TEXT NOT NULL DEFAULT '[]',
    "notes" TEXT,
    "organizerName" TEXT NOT NULL DEFAULT 'عەقارات ڕۆد هۆم',
    "mukhtarName" TEXT NOT NULL DEFAULT '',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Anket_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SupportLetter" (
    "id" TEXT NOT NULL,
    "supportNo" TEXT NOT NULL,
    "recipientKind" TEXT NOT NULL DEFAULT 'GOVERNMENT',
    "purpose" TEXT NOT NULL DEFAULT 'OWNERSHIP',
    "applicant" TEXT NOT NULL DEFAULT 'Road Home ZMKH Real Estate',
    "beneficiaryName" TEXT,
    "beneficiaryIdNo" TEXT,
    "beneficiaryPhone" TEXT,
    "fromName" TEXT,
    "toName" TEXT NOT NULL,
    "recipientAddress" TEXT,
    "subject" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "propertyRef" TEXT,
    "managerName" TEXT NOT NULL,
    "managerTitle" TEXT,
    "branch" TEXT DEFAULT 'بارەگای سەرەکی',
    "issuedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SupportLetter_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Place" (
    "id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "neighborhood" TEXT NOT NULL DEFAULT '',
    "name" TEXT NOT NULL,
    "province" TEXT NOT NULL DEFAULT 'هەولێر',
    "city" TEXT NOT NULL DEFAULT 'هەولێر',
    "plotNo" TEXT NOT NULL DEFAULT '',
    "lat" DOUBLE PRECISION,
    "lng" DOUBLE PRECISION,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Place_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Voucher" (
    "id" TEXT NOT NULL,
    "voucherNo" TEXT NOT NULL,
    "houseId" TEXT,
    "accountType" "VoucherAccountType" NOT NULL,
    "category" "ExpenseCategory",
    "amountIqd" DOUBLE PRECISION NOT NULL,
    "amountUsd" DOUBLE PRECISION NOT NULL,
    "exchangeRate" DOUBLE PRECISION NOT NULL,
    "exchangeLockedAt" TIMESTAMP(3) NOT NULL,
    "paymentMethod" "PaymentMethod" NOT NULL,
    "partyName" TEXT NOT NULL,
    "buyerName" TEXT,
    "periodLabel" TEXT,
    "deductionIqd" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "employeeUserId" TEXT,
    "supplierId" TEXT,
    "customerId" TEXT,
    "note" TEXT,
    "attachmentUrl" TEXT,
    "status" "VoucherStatus" NOT NULL DEFAULT 'POSTED',
    "dueDate" TIMESTAMP(3),
    "reversesId" TEXT,
    "createdById" TEXT,
    "unlockApprovedById" TEXT,
    "unlockApprovedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Voucher_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CashAccount" (
    "id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "currency" "LedgerCurrency" NOT NULL DEFAULT 'IQD',
    "openingBalance" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "allowNegative" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CashAccount_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "BankAccount" (
    "id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "bankName" TEXT NOT NULL,
    "accountNumber" TEXT,
    "currency" "LedgerCurrency" NOT NULL DEFAULT 'IQD',
    "openingBalance" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "allowNegative" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "BankAccount_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "LedgerAccount" (
    "id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "nameKu" TEXT,
    "class" "AccountClass" NOT NULL,
    "isSystem" BOOLEAN NOT NULL DEFAULT true,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "cashAccountId" TEXT,
    "bankAccountId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "LedgerAccount_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "LedgerTransaction" (
    "id" TEXT NOT NULL,
    "txnNo" TEXT NOT NULL,
    "date" TIMESTAMP(3) NOT NULL,
    "type" "LedgerTxnType" NOT NULL,
    "category" TEXT NOT NULL,
    "amountOriginal" DOUBLE PRECISION NOT NULL,
    "currency" "LedgerCurrency" NOT NULL DEFAULT 'IQD',
    "exchangeRate" DOUBLE PRECISION NOT NULL DEFAULT 1,
    "amountBaseIqd" DOUBLE PRECISION NOT NULL,
    "partyName" TEXT,
    "customerId" TEXT,
    "supplierId" TEXT,
    "employeeUserId" TEXT,
    "propertyId" TEXT,
    "houseId" TEXT,
    "paymentMethod" "LedgerPayMethod" NOT NULL DEFAULT 'CASH',
    "cashAccountId" TEXT,
    "bankAccountId" TEXT,
    "transferCashId" TEXT,
    "transferBankId" TEXT,
    "receiptNo" TEXT,
    "voucherNo" TEXT,
    "description" TEXT,
    "attachmentUrl" TEXT,
    "createdById" TEXT,
    "editedById" TEXT,
    "editedAt" TIMESTAMP(3),
    "deletedAt" TIMESTAMP(3),
    "deletedById" TEXT,
    "sourceVoucherId" TEXT,
    "sourceReceiptId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "LedgerTransaction_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TransactionLine" (
    "id" TEXT NOT NULL,
    "transactionId" TEXT NOT NULL,
    "ledgerAccountId" TEXT NOT NULL,
    "debitIqd" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "creditIqd" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "memo" TEXT,

    CONSTRAINT "TransactionLine_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MonthlyReport" (
    "id" TEXT NOT NULL,
    "year" INTEGER NOT NULL,
    "month" INTEGER NOT NULL,
    "generatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "generatedBy" TEXT,
    "snapshotJson" TEXT NOT NULL,
    "htmlPath" TEXT,

    CONSTRAINT "MonthlyReport_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AgentCommissionRule" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "ratePct" DOUBLE PRECISION NOT NULL DEFAULT 2,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AgentCommissionRule_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ConstructionProject" (
    "id" TEXT NOT NULL,
    "houseId" TEXT NOT NULL,
    "status" "ConstructionProjectStatus" NOT NULL DEFAULT 'ACTIVE',
    "closedAt" TIMESTAMP(3),
    "closedById" TEXT,
    "reopenCount" INTEGER NOT NULL DEFAULT 0,
    "lastReopenedAt" TIMESTAMP(3),
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ConstructionProject_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ProjectBudget" (
    "id" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "originalIqd" DECIMAL(65,30) NOT NULL,
    "revisedIqd" DECIMAL(65,30) NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'IQD',
    "effectiveFrom" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "note" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ProjectBudget_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SystemFinanceConfig" (
    "id" TEXT NOT NULL,
    "key" TEXT NOT NULL,
    "valueJson" TEXT NOT NULL,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "SystemFinanceConfig_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Warehouse" (
    "id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "location" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Warehouse_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MaterialCategory" (
    "id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "nameKu" TEXT,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "MaterialCategory_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Material" (
    "id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "nameKu" TEXT,
    "categoryId" TEXT NOT NULL,
    "unit" "MaterialUnit" NOT NULL DEFAULT 'PCS',
    "avgCostIqd" DECIMAL(65,30) NOT NULL DEFAULT 0,
    "minStock" DECIMAL(65,30) NOT NULL DEFAULT 0,
    "currency" TEXT NOT NULL DEFAULT 'IQD',
    "defaultSupplierId" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Material_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "InventoryBalance" (
    "id" TEXT NOT NULL,
    "materialId" TEXT NOT NULL,
    "warehouseId" TEXT NOT NULL,
    "quantity" DECIMAL(65,30) NOT NULL DEFAULT 0,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "InventoryBalance_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "InventoryTransaction" (
    "id" TEXT NOT NULL,
    "txnNo" TEXT NOT NULL,
    "kind" "InventoryTxnKind" NOT NULL,
    "date" TIMESTAMP(3) NOT NULL,
    "warehouseId" TEXT,
    "toWarehouseId" TEXT,
    "projectId" TEXT,
    "houseId" TEXT,
    "supplierId" TEXT,
    "employeeUserId" TEXT,
    "reason" TEXT,
    "note" TEXT,
    "totalCostIqd" DECIMAL(65,30) NOT NULL DEFAULT 0,
    "ledgerTxnId" TEXT,
    "createdById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "InventoryTransaction_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "InventoryTxnLine" (
    "id" TEXT NOT NULL,
    "transactionId" TEXT NOT NULL,
    "materialId" TEXT NOT NULL,
    "quantity" DECIMAL(65,30) NOT NULL,
    "unitCostIqd" DECIMAL(65,30) NOT NULL,
    "totalCostIqd" DECIMAL(65,30) NOT NULL,

    CONSTRAINT "InventoryTxnLine_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MaterialWaste" (
    "id" TEXT NOT NULL,
    "inventoryTxnId" TEXT NOT NULL,
    "materialId" TEXT NOT NULL,
    "projectId" TEXT,
    "quantity" DECIMAL(65,30) NOT NULL,
    "estimatedValueIqd" DECIMAL(65,30) NOT NULL,
    "reason" "WasteReason" NOT NULL,
    "reasonNote" TEXT,
    "date" TIMESTAMP(3) NOT NULL,
    "approvalStatus" "WasteApprovalStatus" NOT NULL DEFAULT 'NOT_REQUIRED',
    "approvedById" TEXT,
    "approvedAt" TIMESTAMP(3),
    "createdById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "MaterialWaste_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "User_phone_key" ON "User"("phone");

-- CreateIndex
CREATE UNIQUE INDEX "PasswordResetToken_tokenHash_key" ON "PasswordResetToken"("tokenHash");

-- CreateIndex
CREATE INDEX "PasswordResetToken_userId_idx" ON "PasswordResetToken"("userId");

-- CreateIndex
CREATE INDEX "PasswordResetToken_expiresAt_idx" ON "PasswordResetToken"("expiresAt");

-- CreateIndex
CREATE INDEX "LoginOtp_phone_idx" ON "LoginOtp"("phone");

-- CreateIndex
CREATE INDEX "LoginOtp_expiresAt_idx" ON "LoginOtp"("expiresAt");

-- CreateIndex
CREATE INDEX "UserPermission_userId_idx" ON "UserPermission"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "UserPermission_userId_key_key" ON "UserPermission"("userId", "key");

-- CreateIndex
CREATE INDEX "ActivityLog_createdAt_idx" ON "ActivityLog"("createdAt");

-- CreateIndex
CREATE INDEX "ActivityLog_userId_idx" ON "ActivityLog"("userId");

-- CreateIndex
CREATE INDEX "Customer_name_idx" ON "Customer"("name");

-- CreateIndex
CREATE INDEX "Customer_phone_idx" ON "Customer"("phone");

-- CreateIndex
CREATE INDEX "Customer_nationalId_idx" ON "Customer"("nationalId");

-- CreateIndex
CREATE UNIQUE INDEX "House_code_key" ON "House"("code");

-- CreateIndex
CREATE UNIQUE INDEX "Contract_contractNo_key" ON "Contract"("contractNo");

-- CreateIndex
CREATE INDEX "Contract_dealEmployeeId_idx" ON "Contract"("dealEmployeeId");

-- CreateIndex
CREATE UNIQUE INDEX "Lease_leaseNo_key" ON "Lease"("leaseNo");

-- CreateIndex
CREATE INDEX "Lease_endDate_status_idx" ON "Lease"("endDate", "status");

-- CreateIndex
CREATE INDEX "Lease_propertyCode_idx" ON "Lease"("propertyCode");

-- CreateIndex
CREATE INDEX "Lease_dealEmployeeId_idx" ON "Lease"("dealEmployeeId");

-- CreateIndex
CREATE INDEX "RentPayment_leaseId_idx" ON "RentPayment"("leaseId");

-- CreateIndex
CREATE UNIQUE INDEX "Receipt_receiptNo_key" ON "Receipt"("receiptNo");

-- CreateIndex
CREATE INDEX "Receipt_leaseId_idx" ON "Receipt"("leaseId");

-- CreateIndex
CREATE INDEX "Receipt_purpose_idx" ON "Receipt"("purpose");

-- CreateIndex
CREATE UNIQUE INDEX "Anket_anketNo_key" ON "Anket"("anketNo");

-- CreateIndex
CREATE INDEX "Anket_issuedAt_idx" ON "Anket"("issuedAt");

-- CreateIndex
CREATE INDEX "Anket_kind_status_idx" ON "Anket"("kind", "status");

-- CreateIndex
CREATE UNIQUE INDEX "SupportLetter_supportNo_key" ON "SupportLetter"("supportNo");

-- CreateIndex
CREATE INDEX "SupportLetter_issuedAt_idx" ON "SupportLetter"("issuedAt");

-- CreateIndex
CREATE INDEX "SupportLetter_recipientKind_idx" ON "SupportLetter"("recipientKind");

-- CreateIndex
CREATE INDEX "SupportLetter_purpose_idx" ON "SupportLetter"("purpose");

-- CreateIndex
CREATE UNIQUE INDEX "Place_code_key" ON "Place"("code");

-- CreateIndex
CREATE INDEX "Place_name_idx" ON "Place"("name");

-- CreateIndex
CREATE INDEX "Place_neighborhood_idx" ON "Place"("neighborhood");

-- CreateIndex
CREATE INDEX "Place_plotNo_idx" ON "Place"("plotNo");

-- CreateIndex
CREATE UNIQUE INDEX "Voucher_voucherNo_key" ON "Voucher"("voucherNo");

-- CreateIndex
CREATE INDEX "Voucher_houseId_status_idx" ON "Voucher"("houseId", "status");

-- CreateIndex
CREATE INDEX "Voucher_accountType_status_idx" ON "Voucher"("accountType", "status");

-- CreateIndex
CREATE INDEX "Voucher_voucherNo_idx" ON "Voucher"("voucherNo");

-- CreateIndex
CREATE UNIQUE INDEX "CashAccount_code_key" ON "CashAccount"("code");

-- CreateIndex
CREATE UNIQUE INDEX "BankAccount_code_key" ON "BankAccount"("code");

-- CreateIndex
CREATE UNIQUE INDEX "LedgerAccount_code_key" ON "LedgerAccount"("code");

-- CreateIndex
CREATE UNIQUE INDEX "LedgerAccount_cashAccountId_key" ON "LedgerAccount"("cashAccountId");

-- CreateIndex
CREATE UNIQUE INDEX "LedgerAccount_bankAccountId_key" ON "LedgerAccount"("bankAccountId");

-- CreateIndex
CREATE UNIQUE INDEX "LedgerTransaction_txnNo_key" ON "LedgerTransaction"("txnNo");

-- CreateIndex
CREATE UNIQUE INDEX "LedgerTransaction_sourceVoucherId_key" ON "LedgerTransaction"("sourceVoucherId");

-- CreateIndex
CREATE UNIQUE INDEX "LedgerTransaction_sourceReceiptId_key" ON "LedgerTransaction"("sourceReceiptId");

-- CreateIndex
CREATE INDEX "LedgerTransaction_date_type_idx" ON "LedgerTransaction"("date", "type");

-- CreateIndex
CREATE INDEX "LedgerTransaction_deletedAt_idx" ON "LedgerTransaction"("deletedAt");

-- CreateIndex
CREATE INDEX "LedgerTransaction_customerId_idx" ON "LedgerTransaction"("customerId");

-- CreateIndex
CREATE INDEX "LedgerTransaction_supplierId_idx" ON "LedgerTransaction"("supplierId");

-- CreateIndex
CREATE INDEX "LedgerTransaction_propertyId_idx" ON "LedgerTransaction"("propertyId");

-- CreateIndex
CREATE INDEX "LedgerTransaction_houseId_idx" ON "LedgerTransaction"("houseId");

-- CreateIndex
CREATE INDEX "LedgerTransaction_category_idx" ON "LedgerTransaction"("category");

-- CreateIndex
CREATE INDEX "TransactionLine_transactionId_idx" ON "TransactionLine"("transactionId");

-- CreateIndex
CREATE INDEX "TransactionLine_ledgerAccountId_idx" ON "TransactionLine"("ledgerAccountId");

-- CreateIndex
CREATE INDEX "MonthlyReport_year_month_idx" ON "MonthlyReport"("year", "month");

-- CreateIndex
CREATE UNIQUE INDEX "MonthlyReport_year_month_key" ON "MonthlyReport"("year", "month");

-- CreateIndex
CREATE UNIQUE INDEX "ConstructionProject_houseId_key" ON "ConstructionProject"("houseId");

-- CreateIndex
CREATE INDEX "ConstructionProject_status_idx" ON "ConstructionProject"("status");

-- CreateIndex
CREATE INDEX "ProjectBudget_projectId_effectiveFrom_idx" ON "ProjectBudget"("projectId", "effectiveFrom");

-- CreateIndex
CREATE UNIQUE INDEX "SystemFinanceConfig_key_key" ON "SystemFinanceConfig"("key");

-- CreateIndex
CREATE UNIQUE INDEX "Warehouse_code_key" ON "Warehouse"("code");

-- CreateIndex
CREATE UNIQUE INDEX "MaterialCategory_code_key" ON "MaterialCategory"("code");

-- CreateIndex
CREATE UNIQUE INDEX "Material_code_key" ON "Material"("code");

-- CreateIndex
CREATE INDEX "Material_categoryId_idx" ON "Material"("categoryId");

-- CreateIndex
CREATE INDEX "Material_isActive_idx" ON "Material"("isActive");

-- CreateIndex
CREATE INDEX "InventoryBalance_warehouseId_idx" ON "InventoryBalance"("warehouseId");

-- CreateIndex
CREATE UNIQUE INDEX "InventoryBalance_materialId_warehouseId_key" ON "InventoryBalance"("materialId", "warehouseId");

-- CreateIndex
CREATE UNIQUE INDEX "InventoryTransaction_txnNo_key" ON "InventoryTransaction"("txnNo");

-- CreateIndex
CREATE UNIQUE INDEX "InventoryTransaction_ledgerTxnId_key" ON "InventoryTransaction"("ledgerTxnId");

-- CreateIndex
CREATE INDEX "InventoryTransaction_kind_date_idx" ON "InventoryTransaction"("kind", "date");

-- CreateIndex
CREATE INDEX "InventoryTransaction_projectId_idx" ON "InventoryTransaction"("projectId");

-- CreateIndex
CREATE INDEX "InventoryTransaction_houseId_idx" ON "InventoryTransaction"("houseId");

-- CreateIndex
CREATE INDEX "InventoryTransaction_warehouseId_idx" ON "InventoryTransaction"("warehouseId");

-- CreateIndex
CREATE INDEX "InventoryTxnLine_transactionId_idx" ON "InventoryTxnLine"("transactionId");

-- CreateIndex
CREATE INDEX "InventoryTxnLine_materialId_idx" ON "InventoryTxnLine"("materialId");

-- CreateIndex
CREATE UNIQUE INDEX "MaterialWaste_inventoryTxnId_key" ON "MaterialWaste"("inventoryTxnId");

-- CreateIndex
CREATE INDEX "MaterialWaste_projectId_idx" ON "MaterialWaste"("projectId");

-- CreateIndex
CREATE INDEX "MaterialWaste_approvalStatus_idx" ON "MaterialWaste"("approvalStatus");

-- AddForeignKey
ALTER TABLE "PasswordResetToken" ADD CONSTRAINT "PasswordResetToken_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UserPermission" ADD CONSTRAINT "UserPermission_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ActivityLog" ADD CONSTRAINT "ActivityLog_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Property" ADD CONSTRAINT "Property_ownerId_fkey" FOREIGN KEY ("ownerId") REFERENCES "Owner"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "House" ADD CONSTRAINT "House_propertyId_fkey" FOREIGN KEY ("propertyId") REFERENCES "Property"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Contract" ADD CONSTRAINT "Contract_dealEmployeeId_fkey" FOREIGN KEY ("dealEmployeeId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Contract" ADD CONSTRAINT "Contract_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "Customer"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Contract" ADD CONSTRAINT "Contract_houseId_fkey" FOREIGN KEY ("houseId") REFERENCES "House"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Lease" ADD CONSTRAINT "Lease_dealEmployeeId_fkey" FOREIGN KEY ("dealEmployeeId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Lease" ADD CONSTRAINT "Lease_houseId_fkey" FOREIGN KEY ("houseId") REFERENCES "House"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RentPayment" ADD CONSTRAINT "RentPayment_leaseId_fkey" FOREIGN KEY ("leaseId") REFERENCES "Lease"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Installment" ADD CONSTRAINT "Installment_contractId_fkey" FOREIGN KEY ("contractId") REFERENCES "Contract"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Receipt" ADD CONSTRAINT "Receipt_contractId_fkey" FOREIGN KEY ("contractId") REFERENCES "Contract"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Receipt" ADD CONSTRAINT "Receipt_leaseId_fkey" FOREIGN KEY ("leaseId") REFERENCES "Lease"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Voucher" ADD CONSTRAINT "Voucher_houseId_fkey" FOREIGN KEY ("houseId") REFERENCES "House"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Voucher" ADD CONSTRAINT "Voucher_employeeUserId_fkey" FOREIGN KEY ("employeeUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Voucher" ADD CONSTRAINT "Voucher_supplierId_fkey" FOREIGN KEY ("supplierId") REFERENCES "Supplier"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Voucher" ADD CONSTRAINT "Voucher_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "Customer"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Voucher" ADD CONSTRAINT "Voucher_reversesId_fkey" FOREIGN KEY ("reversesId") REFERENCES "Voucher"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Voucher" ADD CONSTRAINT "Voucher_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Voucher" ADD CONSTRAINT "Voucher_unlockApprovedById_fkey" FOREIGN KEY ("unlockApprovedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LedgerAccount" ADD CONSTRAINT "LedgerAccount_cashAccountId_fkey" FOREIGN KEY ("cashAccountId") REFERENCES "CashAccount"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LedgerAccount" ADD CONSTRAINT "LedgerAccount_bankAccountId_fkey" FOREIGN KEY ("bankAccountId") REFERENCES "BankAccount"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LedgerTransaction" ADD CONSTRAINT "LedgerTransaction_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "Customer"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LedgerTransaction" ADD CONSTRAINT "LedgerTransaction_supplierId_fkey" FOREIGN KEY ("supplierId") REFERENCES "Supplier"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LedgerTransaction" ADD CONSTRAINT "LedgerTransaction_employeeUserId_fkey" FOREIGN KEY ("employeeUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LedgerTransaction" ADD CONSTRAINT "LedgerTransaction_propertyId_fkey" FOREIGN KEY ("propertyId") REFERENCES "Property"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LedgerTransaction" ADD CONSTRAINT "LedgerTransaction_houseId_fkey" FOREIGN KEY ("houseId") REFERENCES "House"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LedgerTransaction" ADD CONSTRAINT "LedgerTransaction_cashAccountId_fkey" FOREIGN KEY ("cashAccountId") REFERENCES "CashAccount"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LedgerTransaction" ADD CONSTRAINT "LedgerTransaction_bankAccountId_fkey" FOREIGN KEY ("bankAccountId") REFERENCES "BankAccount"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LedgerTransaction" ADD CONSTRAINT "LedgerTransaction_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TransactionLine" ADD CONSTRAINT "TransactionLine_transactionId_fkey" FOREIGN KEY ("transactionId") REFERENCES "LedgerTransaction"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TransactionLine" ADD CONSTRAINT "TransactionLine_ledgerAccountId_fkey" FOREIGN KEY ("ledgerAccountId") REFERENCES "LedgerAccount"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ConstructionProject" ADD CONSTRAINT "ConstructionProject_houseId_fkey" FOREIGN KEY ("houseId") REFERENCES "House"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProjectBudget" ADD CONSTRAINT "ProjectBudget_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "ConstructionProject"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Material" ADD CONSTRAINT "Material_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "MaterialCategory"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Material" ADD CONSTRAINT "Material_defaultSupplierId_fkey" FOREIGN KEY ("defaultSupplierId") REFERENCES "Supplier"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "InventoryBalance" ADD CONSTRAINT "InventoryBalance_materialId_fkey" FOREIGN KEY ("materialId") REFERENCES "Material"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "InventoryBalance" ADD CONSTRAINT "InventoryBalance_warehouseId_fkey" FOREIGN KEY ("warehouseId") REFERENCES "Warehouse"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "InventoryTransaction" ADD CONSTRAINT "InventoryTransaction_warehouseId_fkey" FOREIGN KEY ("warehouseId") REFERENCES "Warehouse"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "InventoryTransaction" ADD CONSTRAINT "InventoryTransaction_toWarehouseId_fkey" FOREIGN KEY ("toWarehouseId") REFERENCES "Warehouse"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "InventoryTransaction" ADD CONSTRAINT "InventoryTransaction_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "ConstructionProject"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "InventoryTransaction" ADD CONSTRAINT "InventoryTransaction_supplierId_fkey" FOREIGN KEY ("supplierId") REFERENCES "Supplier"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "InventoryTransaction" ADD CONSTRAINT "InventoryTransaction_ledgerTxnId_fkey" FOREIGN KEY ("ledgerTxnId") REFERENCES "LedgerTransaction"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "InventoryTransaction" ADD CONSTRAINT "InventoryTransaction_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "InventoryTxnLine" ADD CONSTRAINT "InventoryTxnLine_transactionId_fkey" FOREIGN KEY ("transactionId") REFERENCES "InventoryTransaction"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "InventoryTxnLine" ADD CONSTRAINT "InventoryTxnLine_materialId_fkey" FOREIGN KEY ("materialId") REFERENCES "Material"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MaterialWaste" ADD CONSTRAINT "MaterialWaste_inventoryTxnId_fkey" FOREIGN KEY ("inventoryTxnId") REFERENCES "InventoryTransaction"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MaterialWaste" ADD CONSTRAINT "MaterialWaste_materialId_fkey" FOREIGN KEY ("materialId") REFERENCES "Material"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MaterialWaste" ADD CONSTRAINT "MaterialWaste_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "ConstructionProject"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MaterialWaste" ADD CONSTRAINT "MaterialWaste_approvedById_fkey" FOREIGN KEY ("approvedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MaterialWaste" ADD CONSTRAINT "MaterialWaste_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
