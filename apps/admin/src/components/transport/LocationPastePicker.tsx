import { useEffect, useState } from "react";
import { Button, TextInput, TextArea } from "@lumenx/ui-admin";
import { ExternalLink, ClipboardPaste, MapPin } from "lucide-react";
import {
  googleMapsSearchUrl,
  openStreetMapUrl,
  parseLocationPaste,
  type ParsedLocation,
} from "@/lib/parse-location-paste";

export type LocationPasteValue = ParsedLocation;

type MapProvider = "google" | "osm";

type Props = {
  value: LocationPasteValue | null;
  onChange: (next: LocationPasteValue | null) => void;
  /** Prefill search when opening maps */
  searchHint?: string;
};

const PROVIDER_KEY = "lumenx.admin.transport.mapProvider";

function readProvider(): MapProvider {
  try {
    const v = localStorage.getItem(PROVIDER_KEY);
    if (v === "osm" || v === "google") return v;
  } catch {
    // ignore
  }
  return "google";
}

export function LocationPastePicker({ value, onChange, searchHint = "" }: Props) {
  const [provider, setProvider] = useState<MapProvider>(() => readProvider());
  const [paste, setPaste] = useState("");
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    try {
      localStorage.setItem(PROVIDER_KEY, provider);
    } catch {
      // ignore
    }
  }, [provider]);

  useEffect(() => {
    if (value) {
      setPaste(`${value.lat}, ${value.lng}`);
      setError(null);
    }
  }, [value?.lat, value?.lng]);

  const openMap = () => {
    const url =
      provider === "osm"
        ? value
          ? openStreetMapUrl(value.lat, value.lng)
          : openStreetMapUrl()
        : googleMapsSearchUrl(searchHint || (value ? `${value.lat},${value.lng}` : ""));
    window.open(url, "_blank", "noopener,noreferrer");
  };

  const applyPaste = (raw: string) => {
    setPaste(raw);
    const result = parseLocationPaste(raw);
    if (!result.ok) {
      setError(result.error);
      return;
    }
    setError(null);
    onChange(result.value);
  };

  const onPasteEvent = (e: React.ClipboardEvent<HTMLTextAreaElement>) => {
    const text = e.clipboardData.getData("text");
    if (text.trim()) {
      e.preventDefault();
      applyPaste(text);
    }
  };

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center gap-2">
        <span className="text-[11px] text-muted-foreground">Open map in:</span>
        <div className="flex gap-1 p-0.5 rounded-lg bg-muted/40 border border-border/60">
          {(
            [
              { key: "google", label: "Google Maps" },
              { key: "osm", label: "OpenStreetMap" },
            ] as const
          ).map((p) => (
            <button
              key={p.key}
              type="button"
              onClick={() => setProvider(p.key)}
              className={`px-2.5 h-7 rounded-md text-[11px] font-medium transition-colors ${
                provider === p.key
                  ? "bg-background text-foreground shadow-sm border border-border/50"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              {p.label}
            </button>
          ))}
        </div>
        <Button size="sm" variant="outline" onClick={openMap}>
          <ExternalLink className="size-3.5" />
          Open {provider === "google" ? "Google Maps" : "OpenStreetMap"}
        </Button>
      </div>

      <p className="text-[11px] text-muted-foreground leading-relaxed">
        Find the place → copy the link or coordinates → paste below.
        {provider === "google"
          ? " Tip: right‑click the pin → Copy coordinates."
          : " Tip: copy the browser URL (includes #map=…)."}
      </p>

      <div className="space-y-1.5">
        <div className="flex items-center gap-1.5 text-[11px] font-medium text-muted-foreground">
          <ClipboardPaste className="size-3.5" />
          Paste link or coordinates
        </div>
        <TextArea
          rows={2}
          value={paste}
          placeholder="https://www.google.com/maps/@28.61,77.20,17z  or  28.6139, 77.2090"
          onChange={(e) => {
            setPaste(e.target.value);
            setError(null);
          }}
          onPaste={onPasteEvent}
        />
        <div className="flex flex-wrap gap-2">
          <Button
            size="sm"
            variant="primary"
            onClick={() => applyPaste(paste)}
            disabled={!paste.trim()}
          >
            Use this location
          </Button>
          {value ? (
            <Button
              size="sm"
              variant="ghost"
              onClick={() => {
                setPaste("");
                setError(null);
                onChange(null);
              }}
            >
              Clear
            </Button>
          ) : null}
        </div>
      </div>

      {error ? <p className="text-[11px] text-destructive">{error}</p> : null}

      {value ? (
        <div className="rounded-lg border border-border bg-muted/30 px-3 py-2.5 flex gap-2">
          <MapPin className="size-3.5 mt-0.5 text-teal-700 shrink-0" />
          <div className="min-w-0 space-y-1">
            <p className="text-xs font-medium line-clamp-2">{value.locationLabel}</p>
            <p className="text-[10px] font-mono text-muted-foreground">
              {value.lat.toFixed(5)}, {value.lng.toFixed(5)}
            </p>
            <TextInput
              className="h-7 text-xs mt-1"
              value={value.locationLabel}
              onChange={(e) => onChange({ ...value, locationLabel: e.target.value })}
              placeholder="Location label"
            />
          </div>
        </div>
      ) : null}
    </div>
  );
}
