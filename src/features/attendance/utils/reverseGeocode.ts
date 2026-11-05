// Client-side reverse geocoding (coordinates -> human-readable address) for displaying
// where a punch was recorded. Uses OpenStreetMap Nominatim, which is free and needs no
// API key, but its usage policy caps unattended use at ~1 request/second — this module
// serialises requests and caches by rounded coordinates (~11m) so the same office/home
// location is only looked up once per browser session.
const strNominatimBase = "https://nominatim.openstreetmap.org/reverse";
const intMinRequestGapMs = 1100;

const dicCache = new Map<string, string | null>();
let dtLastRequestAt = 0;
let objRequestChain: Promise<void> = Promise.resolve();

function roundCoord(decValue: number): number {
  return Math.round(decValue * 10000) / 10000;
}

function cacheKey(decLat: number, decLng: number): string {
  return `${roundCoord(decLat)},${roundCoord(decLng)}`;
}

function readSessionCache(strKey: string): string | null | undefined {
  try {
    const strRaw = sessionStorage.getItem(`geo_${strKey}`);
    return strRaw === null ? undefined : (JSON.parse(strRaw) as string | null);
  } catch {
    return undefined;
  }
}

function writeSessionCache(strKey: string, strValue: string | null) {
  try {
    sessionStorage.setItem(`geo_${strKey}`, JSON.stringify(strValue));
  } catch {
    // Best-effort only (private browsing / quota) - in-memory cache still covers this session.
  }
}

async function throttledFetch(strUrl: string): Promise<Response> {
  let objResolveTurn: () => void;
  const objMyTurn = new Promise<void>((objResolve) => {
    objResolveTurn = objResolve;
  });
  const objPreviousChain = objRequestChain;
  objRequestChain = objPreviousChain.then(() => objMyTurn);
  await objPreviousChain;

  const intWait = Math.max(0, intMinRequestGapMs - (Date.now() - dtLastRequestAt));
  if (intWait > 0) {
    await new Promise((objResolve) => setTimeout(objResolve, intWait));
  }
  dtLastRequestAt = Date.now();
  objResolveTurn!();

  return fetch(strUrl, { headers: { Accept: "application/json" } });
}

/** Resolves to a short display address, or `null` if it can't be determined. Never throws. */
export async function reverseGeocode(decLat: number, decLng: number): Promise<string | null> {
  const strKey = cacheKey(decLat, decLng);
  if (dicCache.has(strKey)) {
    return dicCache.get(strKey) ?? null;
  }
  const strCached = readSessionCache(strKey);
  if (strCached !== undefined) {
    dicCache.set(strKey, strCached);
    return strCached;
  }

  try {
    const objResponse = await throttledFetch(
      `${strNominatimBase}?format=jsonv2&lat=${decLat}&lon=${decLng}&zoom=18&addressdetails=0`,
    );
    if (!objResponse.ok) {
      dicCache.set(strKey, null);
      return null;
    }
    const objData = (await objResponse.json()) as { display_name?: string };
    const strAddress = objData.display_name?.trim() || null;
    dicCache.set(strKey, strAddress);
    writeSessionCache(strKey, strAddress);
    return strAddress;
  } catch {
    dicCache.set(strKey, null);
    return null;
  }
}

export function formatCoords(decLat: number, decLng: number): string {
  return `${decLat.toFixed(5)}, ${decLng.toFixed(5)}`;
}
