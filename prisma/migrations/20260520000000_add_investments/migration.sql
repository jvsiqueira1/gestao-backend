-- CreateTable Investment
CREATE TABLE "investment" (
    "id" SERIAL NOT NULL,
    "user_id" INTEGER NOT NULL,
    "name" TEXT NOT NULL,
    "ticker" TEXT,
    "type" TEXT NOT NULL,
    "broker" TEXT,
    "notes" TEXT,
    "archived" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "investment_pkey" PRIMARY KEY ("id")
);

-- CreateTable InvestmentTransaction
CREATE TABLE "investment_transaction" (
    "id" SERIAL NOT NULL,
    "investment_id" INTEGER NOT NULL,
    "user_id" INTEGER NOT NULL,
    "type" TEXT NOT NULL,
    "value" DOUBLE PRECISION NOT NULL,
    "quantity" DOUBLE PRECISION,
    "date" TIMESTAMP(3) NOT NULL,
    "notes" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "investment_transaction_pkey" PRIMARY KEY ("id")
);

-- CreateTable Valuation
CREATE TABLE "valuation" (
    "id" SERIAL NOT NULL,
    "investment_id" INTEGER NOT NULL,
    "user_id" INTEGER NOT NULL,
    "value" DOUBLE PRECISION NOT NULL,
    "date" TIMESTAMP(3) NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "valuation_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "investment_user_id_archived_idx" ON "investment"("user_id", "archived");
CREATE INDEX "investment_transaction_user_id_date_idx" ON "investment_transaction"("user_id", "date");
CREATE INDEX "investment_transaction_investment_id_date_idx" ON "investment_transaction"("investment_id", "date");
CREATE INDEX "valuation_user_id_date_idx" ON "valuation"("user_id", "date");
CREATE INDEX "valuation_investment_id_date_idx" ON "valuation"("investment_id", "date");

-- AddForeignKey
ALTER TABLE "investment" ADD CONSTRAINT "investment_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "investment_transaction" ADD CONSTRAINT "investment_transaction_investment_id_fkey" FOREIGN KEY ("investment_id") REFERENCES "investment"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "investment_transaction" ADD CONSTRAINT "investment_transaction_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "valuation" ADD CONSTRAINT "valuation_investment_id_fkey" FOREIGN KEY ("investment_id") REFERENCES "investment"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "valuation" ADD CONSTRAINT "valuation_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
