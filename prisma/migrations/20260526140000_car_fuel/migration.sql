-- AlterTable
ALTER TABLE "Car" ADD COLUMN "fuelLitres" REAL NOT NULL DEFAULT 45;
ALTER TABLE "Car" ADD COLUMN "fuelTankLitres" REAL NOT NULL DEFAULT 60;

-- Sample levels so the Info tab shows varied top-up states
UPDATE "Car" SET "fuelLitres" = 14, "fuelTankLitres" = 60 WHERE "id" = 'optimus_car_red';
UPDATE "Car" SET "fuelLitres" = 38, "fuelTankLitres" = 60 WHERE "id" = 'optimus_car_black';
