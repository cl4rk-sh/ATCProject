-- AlterTable
ALTER TABLE "SnapshotAircraft" ADD COLUMN     "airlineId" INTEGER;

-- CreateIndex
CREATE INDEX "SnapshotAircraft_airlineId_idx" ON "SnapshotAircraft"("airlineId");

-- AddForeignKey
ALTER TABLE "SnapshotAircraft" ADD CONSTRAINT "SnapshotAircraft_airlineId_fkey" FOREIGN KEY ("airlineId") REFERENCES "Airline"("id") ON DELETE SET NULL ON UPDATE CASCADE;
