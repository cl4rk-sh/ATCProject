import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const hex = (searchParams.get("hex") || "").trim();
    const minutes = Number(searchParams.get("minutes") || "15");
    const maxPoints = Number(searchParams.get("max") || "200");
    const ts = searchParams.get("ts");

    if (!hex) return NextResponse.json({ error: "missing_hex" }, { status: 400 });
    const lookbackMs = Number.isFinite(minutes) && minutes > 0 ? minutes * 60 * 1000 : 15 * 60 * 1000;
    const anchor = ts && !isNaN(Number(ts)) ? new Date(Number(ts) * 1000) : new Date();
    const since = new Date(anchor.getTime() - lookbackMs);

    const rows = await prisma.snapshotAircraft.findMany({
      where: {
        aircraftId: hex,
        snapshot: { capturedAt: { gte: since, lte: anchor } },
      },
      select: {
        lat: true,
        lon: true,
        trackDeg: true,
        trueHeadingDeg: true,
        gsKts: true,
        snapshot: { select: { capturedAt: true } },
      },
      // Fetch newest first so we can take the most recent N points,
      // then reverse to return ascending order to the client
      orderBy: [{ snapshot: { capturedAt: "desc" } }],
      take: Number.isFinite(maxPoints) && maxPoints > 0 ? maxPoints : undefined,
    });

    const points = rows
      .filter((r) => typeof r.lat === "number" && typeof r.lon === "number")
      .map((r) => ({
        lat: r.lat as number,
        lon: r.lon as number,
        t: r.snapshot.capturedAt.toISOString(),
        track: r.trackDeg ?? null,
        gs: r.gsKts ?? null,
        true_heading: r.trueHeadingDeg ?? null,
      }))
      .reverse();

    return NextResponse.json({ hex, points });
  } catch (err) {
    return NextResponse.json({ error: "internal_error" }, { status: 500 });
  }
}


