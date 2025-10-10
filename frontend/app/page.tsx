"use client";
import { useState } from "react";
import { Button } from "@heroui/button";
import { Input } from "@heroui/input";
import { Code } from "@heroui/code";

export default function Home() {
  const [timestamp, setTimestamp] = useState("");
  const [adsbPastS, setAdsbPastS] = useState<number | string>(20);
  const [adsbFutureS, setAdsbFutureS] = useState<number | string>(20);
  const [audioPastS, setAudioPastS] = useState<number | string>(20);
  const [audioFutureS, setAudioFutureS] = useState<number | string>(20);
  const [result, setResult] = useState<string>("");
  const [loading, setLoading] = useState(false);

  const callBackend = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        timestamp,
        adsb_past_s: String(adsbPastS),
        adsb_future_s: String(adsbFutureS),
        audio_past_s: String(audioPastS),
        audio_future_s: String(audioFutureS),
      });
      const res = await fetch(`http://localhost:8000/context?${params.toString()}`);
      const json = await res.json();
      setResult(JSON.stringify(json, null, 2));
    } catch (err: any) {
      setResult(`Error: ${err?.message ?? String(err)}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen p-6 flex flex-col items-center gap-6">
      <div className="w-full max-w-2xl flex flex-col gap-4">
        <Input
          label="Timestamp"
          placeholder="e.g. 2025-10-08T17:31:00Z or 1733700000"
          value={timestamp}
          onChange={(e) => setTimestamp(e.target.value)}
        />
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
        {result && (
          <Code className="whitespace-pre-wrap text-left w-full">{result}</Code>
        )}
      </div>
    </div>
  );
}
