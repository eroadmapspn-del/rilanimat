-- Roles: FREE/PAID/ADMIN -> FREE/PRO/STUDIO/ADMIN
ALTER TYPE "Role" RENAME TO "Role_old";
CREATE TYPE "Role" AS ENUM ('FREE', 'PRO', 'STUDIO', 'ADMIN');
CREATE TYPE "PaidPlan" AS ENUM ('PRO', 'STUDIO');
ALTER TABLE "User" ALTER COLUMN "role" DROP DEFAULT;
ALTER TABLE "User" ALTER COLUMN "role" TYPE "Role" USING (CASE "role"::text WHEN 'ADMIN' THEN 'ADMIN' WHEN 'PAID' THEN 'PRO' ELSE 'FREE' END)::"Role";
ALTER TABLE "User" ALTER COLUMN "role" SET DEFAULT 'FREE';
DROP TYPE "Role_old";

ALTER TABLE "User" ADD COLUMN "planStartedAt" TIMESTAMP(3), ADD COLUMN "planExpiresAt" TIMESTAMP(3);
ALTER TABLE "Order" ADD COLUMN "plan" "PaidPlan" NOT NULL DEFAULT 'PRO';

-- Users who already paid keep PRO for 30 days from now
UPDATE "User" SET "planStartedAt" = now(), "planExpiresAt" = now() + interval '30 days' WHERE "role" = 'PRO';
