-- AlterTable
ALTER TABLE "expense" ADD COLUMN     "endDate" TIMESTAMP(3),
ADD COLUMN     "isFixed" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "recurrenceType" TEXT,
ADD COLUMN     "startDate" TIMESTAMP(3);

-- AlterTable
ALTER TABLE "income" ADD COLUMN     "endDate" TIMESTAMP(3),
ADD COLUMN     "isFixed" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "recurrenceType" TEXT,
ADD COLUMN     "startDate" TIMESTAMP(3);
