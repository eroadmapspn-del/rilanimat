-- Roles: USER/ADMIN -> FREE/PAID/ADMIN
ALTER TYPE "Role" RENAME TO "Role_old";
CREATE TYPE "Role" AS ENUM ('FREE', 'PAID', 'ADMIN');
ALTER TABLE "User" ALTER COLUMN "role" DROP DEFAULT;
ALTER TABLE "User" ALTER COLUMN "role" TYPE "Role" USING (CASE WHEN "role"::text = 'ADMIN' THEN 'ADMIN' ELSE 'FREE' END)::"Role";
ALTER TABLE "User" ALTER COLUMN "role" SET DEFAULT 'FREE';
DROP TYPE "Role_old";

-- Anyone who already paid becomes PAID
UPDATE "User" SET "role" = 'PAID' WHERE "role" = 'FREE' AND EXISTS (SELECT 1 FROM "Order" o WHERE o."userId" = "User"."id" AND o."status" = 'PAID');

-- Clerk -> Auth.js: no external id any more (existing users are matched by email), add password hash for email sign-in
DROP INDEX "User_clerkId_key";
ALTER TABLE "User" DROP COLUMN "clerkId", ADD COLUMN "passwordHash" TEXT;
