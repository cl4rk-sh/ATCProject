-- CreateTable
CREATE TABLE "Aircraft" (
    "id" TEXT NOT NULL,
    "registration" TEXT,
    "model" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Aircraft_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Snapshot" (
    "id" SERIAL NOT NULL,
    "capturedAt" TIMESTAMP(3) NOT NULL,
    "centerLat" DOUBLE PRECISION,
    "centerLon" DOUBLE PRECISION,
    "radiusNm" DOUBLE PRECISION,
    "endpoint" TEXT,
    "total" INTEGER,
    "providerNowMs" BIGINT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Snapshot_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SnapshotAircraft" (
    "id" SERIAL NOT NULL,
    "snapshotId" INTEGER NOT NULL,
    "aircraftId" TEXT NOT NULL,
    "type" TEXT,
    "flight" TEXT,
    "registration" TEXT,
    "model" TEXT,
    "altBaroRaw" TEXT,
    "altBaroFt" INTEGER,
    "altGeomFt" INTEGER,
    "gsKts" DOUBLE PRECISION,
    "trackDeg" DOUBLE PRECISION,
    "trueHeadingDeg" DOUBLE PRECISION,
    "baroRateFpm" INTEGER,
    "geomRateFpm" INTEGER,
    "squawk" TEXT,
    "emergency" TEXT,
    "category" TEXT,
    "lat" DOUBLE PRECISION,
    "lon" DOUBLE PRECISION,
    "nic" INTEGER,
    "rc" INTEGER,
    "version" INTEGER,
    "nac_p" INTEGER,
    "nac_v" INTEGER,
    "sil" INTEGER,
    "sil_type" TEXT,
    "gva" INTEGER,
    "sda" INTEGER,
    "alert" BOOLEAN,
    "spi" BOOLEAN,
    "messages" INTEGER,
    "seenSeconds" DOUBLE PRECISION,
    "rssi" DOUBLE PRECISION,
    "dstNm" DOUBLE PRECISION,
    "dirDeg" DOUBLE PRECISION,
    "nav_qnh_hpa" DOUBLE PRECISION,
    "nav_altitude_mcp" INTEGER,
    "nav_heading_deg" DOUBLE PRECISION,
    "nav_modes" TEXT[],
    "mlat" JSONB,
    "tisb" JSONB,
    "extra" JSONB,

    CONSTRAINT "SnapshotAircraft_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Aircraft_registration_idx" ON "Aircraft"("registration");

-- CreateIndex
CREATE INDEX "Snapshot_capturedAt_idx" ON "Snapshot"("capturedAt");

-- CreateIndex
CREATE INDEX "SnapshotAircraft_snapshotId_idx" ON "SnapshotAircraft"("snapshotId");

-- CreateIndex
CREATE INDEX "SnapshotAircraft_aircraftId_idx" ON "SnapshotAircraft"("aircraftId");

-- CreateIndex
CREATE INDEX "SnapshotAircraft_flight_idx" ON "SnapshotAircraft"("flight");

-- CreateIndex
CREATE INDEX "SnapshotAircraft_lat_lon_idx" ON "SnapshotAircraft"("lat", "lon");

-- CreateIndex
CREATE UNIQUE INDEX "SnapshotAircraft_snapshotId_aircraftId_key" ON "SnapshotAircraft"("snapshotId", "aircraftId");

-- AddForeignKey
ALTER TABLE "SnapshotAircraft" ADD CONSTRAINT "SnapshotAircraft_snapshotId_fkey" FOREIGN KEY ("snapshotId") REFERENCES "Snapshot"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SnapshotAircraft" ADD CONSTRAINT "SnapshotAircraft_aircraftId_fkey" FOREIGN KEY ("aircraftId") REFERENCES "Aircraft"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
