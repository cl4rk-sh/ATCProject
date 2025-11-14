"use client";

import { Slider } from "@heroui/slider";

type TimeSliderProps = {
  startEpoch: number;
  endEpoch: number;
  value: number;
  onChange: (value: number) => void;
};

export default function TimeSlider({
  startEpoch,
  endEpoch,
  value,
  onChange,
}: TimeSliderProps) {
  return (
    <div className="w-full flex flex-col items-center gap-2 py-2">
      <div className="flex items-center justify-between w-full text-xs text-foreground/80">
        <span>{new Date(startEpoch * 1000).toISOString().replace(".000Z", "Z")}</span>
        <span className="font-medium">{new Date(value * 1000).toISOString().replace(".000Z", "Z")}</span>
        <span>{new Date(endEpoch * 1000).toISOString().replace(".000Z", "Z")}</span>
      </div>
      <div className="w-full rounded-md border border-foreground/10 px-3 py-2">
        <Slider
          aria-label="Timestamp"
          minValue={startEpoch}
          maxValue={endEpoch}
          step={2}
          value={value}
          onChange={(val) => {
            const next = Array.isArray(val) ? val[0] : val;
            if (typeof next === "number") onChange(next);
          }}
        />
      </div>
    </div>
  );
}

