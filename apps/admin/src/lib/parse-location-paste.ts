/** Parse pasted Google Maps / OpenStreetMap links or raw coordinates. */

export type ParsedLocation = {
  lat: number;
  lng: number;
  locationLabel: string;
};

function isValidCoord(lat: number, lng: number): boolean {
  return (
    Number.isFinite(lat) &&
    Number.isFinite(lng) &&
    Math.abs(lat) <= 90 &&
    Math.abs(lng) <= 180
  );
}

function labelFromCoords(lat: number, lng: number, hint?: string): string {
  const coords = `${lat.toFixed(5)}, ${lng.toFixed(5)}`;
  return hint?.trim() ? `${hint.trim()} (${coords})` : coords;
}

function decodeMaybe(s: string): string {
  try {
    return decodeURIComponent(s);
  } catch {
    return s;
  }
}

/** Raw `lat, lng` or `lat lng` */
function parseRawCoords(text: string): ParsedLocation | null {
  const m = text
    .trim()
    .match(/^(-?\d+(?:\.\d+)?)\s*[, ]\s*(-?\d+(?:\.\d+)?)(?:\s|$)/);
  if (!m) return null;
  const lat = Number(m[1]);
  const lng = Number(m[2]);
  if (!isValidCoord(lat, lng)) return null;
  return { lat, lng, locationLabel: labelFromCoords(lat, lng) };
}

function parseOsm(url: string): ParsedLocation | null {
  // #map=zoom/lat/lng
  const hash = url.match(/#map=\d+\/(-?\d+(?:\.\d+)?)\/(-?\d+(?:\.\d+)?)/);
  if (hash) {
    const lat = Number(hash[1]);
    const lng = Number(hash[2]);
    if (isValidCoord(lat, lng)) {
      return { lat, lng, locationLabel: labelFromCoords(lat, lng, "OpenStreetMap") };
    }
  }
  try {
    const u = new URL(url);
    const mlat = u.searchParams.get("mlat");
    const mlon = u.searchParams.get("mlon");
    if (mlat && mlon) {
      const lat = Number(mlat);
      const lng = Number(mlon);
      if (isValidCoord(lat, lng)) {
        return { lat, lng, locationLabel: labelFromCoords(lat, lng, "OpenStreetMap") };
      }
    }
  } catch {
    // ignore
  }
  return null;
}

function parseGoogle(url: string): ParsedLocation | null {
  const decoded = decodeMaybe(url);

  // /@lat,lng,zoom
  const at = decoded.match(/@(-?\d+(?:\.\d+)?),(-?\d+(?:\.\d+)?)/);
  if (at) {
    const lat = Number(at[1]);
    const lng = Number(at[2]);
    if (isValidCoord(lat, lng)) {
      const place = decoded.match(/\/place\/([^/@]+)/);
      const placeName = place ? decodeMaybe(place[1].replace(/\+/g, " ")) : "Google Maps";
      return { lat, lng, locationLabel: labelFromCoords(lat, lng, placeName) };
    }
  }

  // !3dLAT!4dLNG (data blob)
  const d3 = decoded.match(/!3d(-?\d+(?:\.\d+)?)!4d(-?\d+(?:\.\d+)?)/);
  if (d3) {
    const lat = Number(d3[1]);
    const lng = Number(d3[2]);
    if (isValidCoord(lat, lng)) {
      return { lat, lng, locationLabel: labelFromCoords(lat, lng, "Google Maps") };
    }
  }

  try {
    const u = new URL(decoded.startsWith("http") ? decoded : `https://${decoded}`);
    const q =
      u.searchParams.get("q") ||
      u.searchParams.get("query") ||
      u.searchParams.get("ll");
    if (q) {
      const raw = parseRawCoords(decodeMaybe(q));
      if (raw) {
        return {
          ...raw,
          locationLabel: labelFromCoords(raw.lat, raw.lng, "Google Maps"),
        };
      }
    }
    // destination=lat,lng
    const dest = u.searchParams.get("destination");
    if (dest) {
      const raw = parseRawCoords(decodeMaybe(dest));
      if (raw) return { ...raw, locationLabel: labelFromCoords(raw.lat, raw.lng, "Google Maps") };
    }
  } catch {
    // ignore
  }

  return null;
}

/**
 * Parse a pasted location string (URL or coordinates).
 * Short links (maps.app.goo.gl) cannot be resolved client-side — returns null with reason.
 */
export function parseLocationPaste(raw: string): {
  ok: true;
  value: ParsedLocation;
} | {
  ok: false;
  error: string;
} {
  const text = raw.trim();
  if (!text) return { ok: false, error: "Paste a map link or coordinates" };

  if (/maps\.app\.goo\.gl|goo\.gl\/maps/i.test(text)) {
    return {
      ok: false,
      error:
        "Short Google links can’t be read here. Open the link → Share → Copy link (full URL), or paste lat, lng.",
    };
  }

  const asCoords = parseRawCoords(text);
  if (asCoords) return { ok: true, value: asCoords };

  if (/openstreetmap\.org/i.test(text)) {
    const osm = parseOsm(text);
    if (osm) return { ok: true, value: osm };
    return {
      ok: false,
      error: "Couldn’t read that OSM link. Use the browser URL with #map=zoom/lat/lng.",
    };
  }

  if (/google\.[^/]+\/maps|maps\.google\./i.test(text)) {
    const g = parseGoogle(text);
    if (g) return { ok: true, value: g };
    return {
      ok: false,
      error:
        "Couldn’t read coordinates from that Google link. Right‑click the pin → Copy coordinates, or paste lat, lng.",
    };
  }

  // Bare URL-ish with @coords
  if (text.includes("@")) {
    const g = parseGoogle(text);
    if (g) return { ok: true, value: g };
  }

  return {
    ok: false,
    error: "Paste a Google Maps or OpenStreetMap link, or coordinates like 28.6139, 77.2090",
  };
}

export function googleMapsSearchUrl(query = ""): string {
  const q = query.trim() || "school";
  return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(q)}`;
}

export function openStreetMapUrl(lat = 28.6139, lng = 77.209): string {
  return `https://www.openstreetmap.org/#map=15/${lat}/${lng}`;
}

export function mapsUrlForCoords(lat: number, lng: number, provider: "google" | "osm"): string {
  if (provider === "osm") return `https://www.openstreetmap.org/?mlat=${lat}&mlon=${lng}#map=16/${lat}/${lng}`;
  return `https://www.google.com/maps/search/?api=1&query=${lat}%2C${lng}`;
}
