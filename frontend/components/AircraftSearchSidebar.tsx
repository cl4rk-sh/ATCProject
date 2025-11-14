"use client";

import { Input } from "@heroui/input";
import type { Aircraft } from "@/types/aircraft";
import { getPronunciation } from "@/utils/aircraft-utils";

type AircraftSearchSidebarProps = {
  searchQuery: string;
  onSearchChange: (query: string) => void;
  currentAircraft: Aircraft[];
  searchResults: { aircraft: Aircraft[]; additional: Aircraft[] };
  onAircraftHover: (hex: string | null) => void;
};

function AircraftItem({ aircraft, onHover }: { aircraft: Aircraft; onHover: (hex: string | null) => void }) {
  const pronunciation = getPronunciation(aircraft.flight, aircraft.airline);
  return (
    <div
      className="p-2 rounded-md border border-foreground/10 text-xs hover:bg-foreground/5 cursor-pointer"
      onMouseEnter={() => onHover((aircraft.hex as string) || null)}
      onMouseLeave={() => onHover(null)}
    >
      <div className="font-medium">{(aircraft.flight ?? aircraft.hex ?? "").trim()}</div>
      <div className="text-foreground/60 italic">{pronunciation}</div>
      {aircraft.airline && (
        <div className="text-foreground/50 mt-1">
          {aircraft.airline.name || aircraft.airline.icaoCode}
        </div>
      )}
    </div>
  );
}

export default function AircraftSearchSidebar({
  searchQuery,
  onSearchChange,
  currentAircraft,
  searchResults,
  onAircraftHover,
}: AircraftSearchSidebarProps) {
  const hasSearchQuery = searchQuery.trim().length > 0;
  const totalResults = searchResults.aircraft.length + searchResults.additional.length;
  const showCurrentSection = !hasSearchQuery || currentAircraft.length > 0;
  const showAdditionalSection = hasSearchQuery && searchResults.additional.length > 0;

  return (
    <div className="w-64 flex-shrink-0 flex flex-col border-r border-foreground/10 p-4">
      <div className="mb-4">
        <Input
          label="Search Aircraft"
          placeholder="e.g., united, 789, UAL"
          value={searchQuery}
          onValueChange={onSearchChange}
          size="sm"
        />
      </div>
      {hasSearchQuery && (
        <div className="text-xs text-foreground/60 mb-2">
          {totalResults} aircraft found
        </div>
      )}
      <div className="flex-1 overflow-y-auto space-y-4">
        {/* Current timestamp aircraft */}
        {showCurrentSection && (
          <div>
            {hasSearchQuery && currentAircraft.length > 0 && (
              <div className="text-xs font-semibold text-foreground/70 mb-2 sticky top-0 bg-background/95 backdrop-blur-sm py-1">
                Current ({currentAircraft.length})
              </div>
            )}
            {currentAircraft.length > 0 ? (
              <div className="space-y-2">
                {currentAircraft.map((p) => (
                  <AircraftItem key={p.hex ?? `${p.lat}_${p.lon}`} aircraft={p} onHover={onAircraftHover} />
                ))}
              </div>
            ) : !hasSearchQuery ? (
              <div className="text-xs text-foreground/40">Enter a search query to filter aircraft</div>
            ) : null}
          </div>
        )}

        {/* Additional aircraft from other timestamps */}
        {showAdditionalSection && (
          <div>
            <div className="text-xs font-semibold text-foreground/70 mb-2 sticky top-0 bg-background/95 backdrop-blur-sm py-1">
              Additional ({searchResults.additional.length})
            </div>
            <div className="space-y-2">
              {searchResults.additional.map((p) => (
                <AircraftItem key={p.hex ?? `${p.lat}_${p.lon}`} aircraft={p} onHover={onAircraftHover} />
              ))}
            </div>
          </div>
        )}

        {/* No results message */}
        {hasSearchQuery && totalResults === 0 && (
          <div className="text-xs text-foreground/40">No aircraft found</div>
        )}
      </div>
    </div>
  );
}

