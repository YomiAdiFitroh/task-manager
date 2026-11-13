-- CreateEnum
CREATE TYPE "Tag" AS ENUM ('WORK', 'DEV', 'DESIGN', 'PERSONAL');

-- AlterTable
ALTER TABLE "Task" ADD COLUMN     "tag" "Tag" NOT NULL DEFAULT 'WORK';
