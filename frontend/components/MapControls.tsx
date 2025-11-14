"use client";

import { Switch } from "@heroui/switch";

type MapControlsProps = {
  showNewarkBorders: boolean;
  onNewarkBordersChange: (value: boolean) => void;
  showNewarkGround: boolean;
  onNewarkGroundChange: (value: boolean) => void;
  showOutsideGround: boolean;
  onOutsideGroundChange: (value: boolean) => void;
};

export default function MapControls({
  showNewarkBorders,
  onNewarkBordersChange,
  showNewarkGround,
  onNewarkGroundChange,
  showOutsideGround,
  onOutsideGroundChange,
}: MapControlsProps) {
  return (
    <div className="w-full grid grid-cols-1 sm:grid-cols-3 gap-3 py-2">
      <div className="flex items-center justify-between gap-3 rounded-md border border-foreground/10 px-3 py-2">
        <div className="text-sm">Show Newark borders (20 nm)</div>
        <Switch isSelected={showNewarkBorders} onValueChange={onNewarkBordersChange} aria-label="Show Newark borders" />
      </div>
      <div className="flex items-center justify-between gap-3 rounded-md border border-foreground/10 px-3 py-2">
        <div className="text-sm">Show Newark ground traffic (2 mi)</div>
        <Switch isSelected={showNewarkGround} onValueChange={onNewarkGroundChange} aria-label="Show Newark ground traffic" />
      </div>
      <div className="flex items-center justify-between gap-3 rounded-md border border-foreground/10 px-3 py-2">
        <div className="text-sm">Show ground aircraft outside Newark</div>
        <Switch isSelected={showOutsideGround} onValueChange={onOutsideGroundChange} aria-label="Show ground aircraft outside Newark" />
      </div>
    </div>
  );
}

