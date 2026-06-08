-- AlterTable
ALTER TABLE "Car" ADD COLUMN "odometerKm" DOUBLE PRECISION;

-- CreateTable
CREATE TABLE "Inspection" (
    "id" TEXT NOT NULL,
    "carId" TEXT NOT NULL,
    "driverName" TEXT NOT NULL,
    "kind" TEXT NOT NULL DEFAULT 'checkin',
    "odometerKm" DOUBLE PRECISION,
    "fuelLitres" DOUBLE PRECISION,
    "fuelFraction" DOUBLE PRECISION,
    "aiConfidence" TEXT,
    "aiRaw" JSONB,
    "photoPaths" TEXT[],
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Inspection_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Inspection_carId_idx" ON "Inspection"("carId");

-- CreateIndex
CREATE INDEX "Inspection_createdAt_idx" ON "Inspection"("createdAt");

-- AddForeignKey
ALTER TABLE "Inspection" ADD CONSTRAINT "Inspection_carId_fkey" FOREIGN KEY ("carId") REFERENCES "Car"("id") ON DELETE CASCADE ON UPDATE CASCADE;
