// Best-effort browser geolocation capture for web punches. Mirrors the mobile app's
// behaviour: location is optional context on the punch record, never a gate on whether
// the punch succeeds, so every failure path resolves to `null` instead of throwing.
export type GeoCoords = {
  decGeoLat: number;
  decGeoLng: number;
};

export function getCurrentPositionSafe(intTimeoutMs = 6000): Promise<GeoCoords | null> {
  return new Promise((resolve) => {
    if (typeof navigator === "undefined" || !navigator.geolocation) {
      resolve(null);
      return;
    }
    const intTimer = setTimeout(() => resolve(null), intTimeoutMs);
    navigator.geolocation.getCurrentPosition(
      (objPosition) => {
        clearTimeout(intTimer);
        resolve({
          decGeoLat: objPosition.coords.latitude,
          decGeoLng: objPosition.coords.longitude,
        });
      },
      () => {
        clearTimeout(intTimer);
        resolve(null);
      },
      { enableHighAccuracy: true, timeout: intTimeoutMs, maximumAge: 60000 },
    );
  });
}
