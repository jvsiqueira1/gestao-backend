-- CreateTable
CREATE TABLE "FinancialGoal" (
    "id" SERIAL NOT NULL,
    "user_id" INTEGER NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "target" DOUBLE PRECISION NOT NULL,
    "saved" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "deadline" TIMESTAMP(3),
    "status" TEXT NOT NULL DEFAULT 'active',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "FinancialGoal_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "FinancialGoal" ADD CONSTRAINT "FinancialGoal_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
