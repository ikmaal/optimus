-- PostgreSQL baseline (replaces prior SQLite migrations)

CREATE TABLE "Car" (
    "id" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "plate" TEXT,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "fuelLitres" DOUBLE PRECISION NOT NULL DEFAULT 45,
    "fuelTankLitres" DOUBLE PRECISION NOT NULL DEFAULT 60,

    CONSTRAINT "Car_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "Booking" (
    "id" TEXT NOT NULL,
    "carId" TEXT NOT NULL,
    "bookerName" TEXT NOT NULL,
    "startAt" TIMESTAMP(3) NOT NULL,
    "endAt" TIMESTAMP(3) NOT NULL,
    "reason" TEXT,
    "cancelledAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Booking_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "Booking_carId_idx" ON "Booking"("carId");

CREATE INDEX "Booking_startAt_endAt_idx" ON "Booking"("startAt", "endAt");

ALTER TABLE "Booking" ADD CONSTRAINT "Booking_carId_fkey" FOREIGN KEY ("carId") REFERENCES "Car"("id") ON DELETE CASCADE ON UPDATE CASCADE;
