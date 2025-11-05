import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

function parseAt(searchParams: URLSearchParams): Date | null {
  const ts = searchParams.get("ts");
  const at = searchParams.get("at");
  if (ts) {
    const n = Number(ts);
    if (Number.isFinite(n)) return new Date(n * 1000);
  }
  if (at) {
    const d = new Date(at);
    if (!isNaN(d.getTime())) return d;
  }
  return null;
}

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const atDate = parseAt(searchParams);

    let snapshot = null as null | { id: number; capturedAt: Date };
    if (atDate) {
      snapshot = await prisma.snapshot.findFirst({
        where: { capturedAt: { lte: atDate } },
        orderBy: { capturedAt: "desc" },
        select: { id: true, capturedAt: true },
      });
      if (!snapshot) {
        snapshot = await prisma.snapshot.findFirst({
          where: { capturedAt: { gte: atDate } },
          orderBy: { capturedAt: "asc" },
          select: { id: true, capturedAt: true },
        });
      }
    }

    if (!snapshot) {
      snapshot = await prisma.snapshot.findFirst({
        orderBy: { capturedAt: "desc" },
        select: { id: true, capturedAt: true },
      });
    }

    if (!snapshot) return NextResponse.json({ snapshot: null, aircraft: [] });

    const rows = await prisma.snapshotAircraft.findMany({
      where: { snapshotId: snapshot.id },
      select: {
        aircraftId: true,
        lat: true,
        lon: true,
        gsKts: true,
        trackDeg: true,
        trueHeadingDeg: true,
        nav_heading_deg: true,
        model: true,
        flight: true,
        altBaroRaw: true,
        altBaroFt: true,
        airlineId: true,
        airline: {
          select: {
            icaoCode: true,
            callsign: true,
            name: true,
          },
        },
      },
    });

    const aircraft = rows
      .filter((r) => typeof r.lat === "number" && typeof r.lon === "number")
      .map((r) => ({
        hex: r.aircraftId,
        lat: r.lat,
        lon: r.lon,
        gs: r.gsKts ?? null,
        track: r.trackDeg ?? null,
        true_heading: r.trueHeadingDeg ?? null,
        nav_heading: r.nav_heading_deg ?? null,
        t: r.model ?? null,
        flight: r.flight ?? null,
        alt_baro: r.altBaroRaw != null ? r.altBaroRaw : r.altBaroFt,
        airline: r.airline ? {
          icaoCode: r.airline.icaoCode,
          callsign: r.airline.callsign,
          name: r.airline.name,
        } : null,
      }));

    return NextResponse.json({
      snapshot: { id: snapshot.id, capturedAt: snapshot.capturedAt.toISOString() },
      aircraft,
    });
  } catch (err) {
    return NextResponse.json({ error: "internal_error" }, { status: 500 });
  }
}



