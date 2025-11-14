import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const query = (searchParams.get("q") || "").trim().toLowerCase();
    const currentSnapshotId = searchParams.get("currentSnapshotId");

    if (!query) {
      return NextResponse.json({ aircraft: [], additional: [] });
    }

    // Search for aircraft by flight number, hex, or airline
    const searchConditions = {
      OR: [
        { flight: { contains: query, mode: "insensitive" as const } },
        { aircraftId: { contains: query, mode: "insensitive" as const } },
        { registration: { contains: query, mode: "insensitive" as const } },
        {
          airline: {
            OR: [
              { icaoCode: { contains: query, mode: "insensitive" as const } },
              { callsign: { contains: query, mode: "insensitive" as const } },
              { name: { contains: query, mode: "insensitive" as const } },
            ],
          },
        },
      ],
    };

    // Get all matching aircraft observations
    const allObservations = await prisma.snapshotAircraft.findMany({
      where: searchConditions,
      select: {
        aircraftId: true,
        flight: true,
        lat: true,
        lon: true,
        gsKts: true,
        trackDeg: true,
        trueHeadingDeg: true,
        nav_heading_deg: true,
        altBaroRaw: true,
        altBaroFt: true,
        snapshotId: true,
        snapshot: {
          select: {
            capturedAt: true,
          },
        },
        airline: {
          select: {
            icaoCode: true,
            callsign: true,
            name: true,
          },
        },
      },
      orderBy: [{ snapshot: { capturedAt: "desc" } }],
      take: 500, // Limit to prevent too many results
    });

    // Group by aircraftId to get unique aircraft
    const aircraftMap = new Map<string, typeof allObservations[0]>();
    for (const obs of allObservations) {
      if (!aircraftMap.has(obs.aircraftId)) {
        aircraftMap.set(obs.aircraftId, obs);
      }
    }

    const allAircraft = Array.from(aircraftMap.values());

    // Separate current timestamp aircraft from others
    const currentSnapshotIdNum = currentSnapshotId ? parseInt(currentSnapshotId) : null;
    const currentAircraft = currentSnapshotIdNum
      ? allAircraft.filter((a) => a.snapshotId === currentSnapshotIdNum)
      : [];
    const additionalAircraft = currentSnapshotIdNum
      ? allAircraft.filter((a) => a.snapshotId !== currentSnapshotIdNum)
      : allAircraft;

    // Transform to match Aircraft type
    const transformAircraft = (obs: typeof allObservations[0]) => ({
      hex: obs.aircraftId,
      lat: obs.lat ?? undefined,
      lon: obs.lon ?? undefined,
      track: obs.trackDeg ?? undefined,
      true_heading: obs.trueHeadingDeg ?? undefined,
      nav_heading: obs.nav_heading_deg ?? undefined,
      flight: obs.flight ?? undefined,
      alt_baro: obs.altBaroRaw ?? obs.altBaroFt ?? undefined,
      gs: obs.gsKts ?? undefined,
      airline: obs.airline
        ? {
            icaoCode: obs.airline.icaoCode,
            callsign: obs.airline.callsign,
            name: obs.airline.name,
          }
        : null,
    });

    return NextResponse.json({
      aircraft: currentAircraft.map(transformAircraft),
      additional: additionalAircraft.map(transformAircraft),
    });
  } catch (err) {
    console.error("Search error:", err);
    return NextResponse.json({ error: "internal_error", aircraft: [], additional: [] }, { status: 500 });
  }
}

