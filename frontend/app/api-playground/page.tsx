"use client";
import { useMemo, useState } from "react";
import { Button } from "@heroui/button";
import { Input } from "@heroui/input";
import { Code } from "@heroui/code";
import { Slider } from "@heroui/slider";
import dynamic from "next/dynamic";

export default function Home() {
  // Time slider bounds (compact Z format): 20251008T173000Z .. 20251008T175958Z
  const START_TS = "20251008T173000Z";
  const END_TS = "20251008T175958Z";

  const toIsoZ = (compact: string) =>
    `${compact.slice(0, 4)}-${compact.slice(4, 6)}-${compact.slice(6, 8)}T${compact.slice(9, 11)}:${compact.slice(11, 13)}:${compact.slice(13, 15)}Z`;

  const startEpoch = useMemo(() => Math.floor(new Date(toIsoZ(START_TS)).getTime() / 1000), []);
  const endEpoch = useMemo(() => Math.floor(new Date(toIsoZ(END_TS)).getTime() / 1000), []);

  // Store timestamp as epoch seconds for simplicity
  const [epochSeconds, setEpochSeconds] = useState<number>(startEpoch);
  const [adsbPastS, setAdsbPastS] = useState<number | string>(20);
  const [adsbFutureS, setAdsbFutureS] = useState<number | string>(20);
  const [audioPastS, setAudioPastS] = useState<number | string>(20);
  const [audioFutureS, setAudioFutureS] = useState<number | string>(20);
  const [result, setResult] = useState<string>("");
  const [loading, setLoading] = useState(false);
  const [prevAudioUrl, setPrevAudioUrl] = useState<string>("");
  const [nextAudioUrl, setNextAudioUrl] = useState<string>("");

  // Lazy load the audio player to avoid SSR issues
  const AudioPlayer = useMemo(
    () => dynamic(() => import("react-h5-audio-player"), { ssr: false }),
    []
  );

  const callBackend = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        timestamp: String(epochSeconds), // send epoch seconds (backend supports this)
        adsb_past_s: String(adsbPastS),
        adsb_future_s: String(adsbFutureS),
        audio_past_s: String(audioPastS),
        audio_future_s: String(audioFutureS),
      });
      const res = await fetch(`http://localhost:8000/context?${params.toString()}`);
      const json = await res.json();
      setResult(JSON.stringify(json, null, 2));
      // Extract audio URLs and prefix with backend base
      try {
        const prev = json?.audio?.prev_url as string | undefined;
        const next = json?.audio?.next_url as string | undefined;
        const base = "http://localhost:8000";
        setPrevAudioUrl(prev ? `${base}${prev}` : "");
        setNextAudioUrl(next ? `${base}${next}` : "");
      } catch {
        setPrevAudioUrl("");
        setNextAudioUrl("");
      }
    } catch (err: any) {
      setResult(`Error: ${err?.message ?? String(err)}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen p-6 flex flex-col items-center gap-6">
      <div className="w-full max-w-2xl flex flex-col gap-4">
        <div className="flex flex-col gap-2">
          <div className="flex items-center justify-between text-sm text-foreground/80">
            <span>{new Date(startEpoch * 1000).toISOString().replace(".000Z", "Z")}</span>
            <span className="font-medium">{new Date(epochSeconds * 1000).toISOString().replace(".000Z", "Z")}</span>
            <span>{new Date(endEpoch * 1000).toISOString().replace(".000Z", "Z")}</span>
          </div>
          <Slider
            aria-label="Timestamp"
            minValue={startEpoch}
            maxValue={endEpoch}
            step={2}
            value={epochSeconds}
            onChange={(val) => {
              const next = Array.isArray(val) ? val[0] : val;
              if (typeof next === "number") setEpochSeconds(next);
            }}
          />
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Input
            type="number"
            label="ADS-B Past (s)"
            value={String(adsbPastS)}
            onChange={(e) => setAdsbPastS(e.target.value)}
          />
          <Input
            type="number"
            label="ADS-B Future (s)"
            value={String(adsbFutureS)}
            onChange={(e) => setAdsbFutureS(e.target.value)}
          />
          <Input
            type="number"
            label="Audio Past (s)"
            value={String(audioPastS)}
            onChange={(e) => setAudioPastS(e.target.value)}
          />
          <Input
            type="number"
            label="Audio Future (s)"
            value={String(audioFutureS)}
            onChange={(e) => setAudioFutureS(e.target.value)}
          />
        </div>
        <Button color="primary" onPress={callBackend} isLoading={loading}>
          Call Backend API
        </Button>
        {(prevAudioUrl || nextAudioUrl) && (
          <div className="flex flex-col gap-4">
            {prevAudioUrl && (
              <div>
                <div className="text-sm mb-1">Prev Segment</div>
                <AudioPlayer src={prevAudioUrl} autoPlay={false} showJumpControls={false} showSkipControls={false} />
              </div>
            )}
            {nextAudioUrl && (
              <div>
                <div className="text-sm mb-1">Next Segment</div>
                <AudioPlayer src={nextAudioUrl} autoPlay={false} showJumpControls={false} showSkipControls={false} />
              </div>
            )}
          </div>
        )}
        {result && (
          <Code className="whitespace-pre-wrap text-left w-full">{result}</Code>
        )}
      </div>
    </div>
  );
}


