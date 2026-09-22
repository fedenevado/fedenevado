-- AlterTable: add "username" as nullable first, backfill existing rows,
-- then enforce NOT NULL + UNIQUE. A single ADD COLUMN with a fixed default
-- would violate uniqueness across the 7 existing rows, so this is done in
-- three steps instead of Prisma's usual one-step "required column" SQL.
ALTER TABLE "users" ADD COLUMN "username" TEXT;

-- Backfill: same slugify rule the backend will use for new suggestions
-- (lowercase, accents stripped, spaces -> "."). No collisions among these
-- 7 real accounts, so no numeric suffix is needed.
UPDATE "users" SET "username" = 'fedenevado' WHERE "id" = '145de340-94bd-4b9f-a98d-c352f7fe9be4';
UPDATE "users" SET "username" = 'ana' WHERE "id" = '28231377-c89e-45b8-a038-0a40d81cb361';
UPDATE "users" SET "username" = 'test' WHERE "id" = 'c4187c8f-a6cd-4869-adaf-9fb8e574cfc0';
UPDATE "users" SET "username" = 'test2' WHERE "id" = 'dd4fac9f-5a06-4c05-b5b1-517a18ee12ec';
UPDATE "users" SET "username" = 'tomas' WHERE "id" = '258a7263-6ffa-4781-97ff-252094cd13a5';
UPDATE "users" SET "username" = 'maria' WHERE "id" = 'a9ca86ab-dc3a-4959-a1d4-d9d5c6866700';
UPDATE "users" SET "username" = 'fer' WHERE "id" = 'b560c891-c2cc-495a-9eb1-1cad82d46066';

ALTER TABLE "users" ALTER COLUMN "username" SET NOT NULL;

CREATE UNIQUE INDEX "users_username_key" ON "users"("username");
