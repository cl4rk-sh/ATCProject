-- CreateTable
CREATE TABLE "Airline" (
    "id" SERIAL NOT NULL,
    "icaoCode" TEXT NOT NULL,
    "callsign" TEXT,
    "name" TEXT,
    "iataCode" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Airline_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Airline_icaoCode_key" ON "Airline"("icaoCode");

-- CreateIndex
CREATE INDEX "Airline_name_idx" ON "Airline"("name");
