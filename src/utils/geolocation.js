// Capture the user's geo-location at check-in / check-out.
// Best-effort: resolves coordinates via the browser and reverse-geocodes to a
// human-readable district/city/state using OpenStreetMap Nominatim (no API key).
// Never throws to the caller — returns null if unavailable/denied so check-in
// is never blocked.

function getCoords(timeout = 9000) {
  return new Promise((resolve, reject) => {
    if (typeof navigator === "undefined" || !navigator.geolocation) {
      return reject(new Error("Geolocation not supported"));
    }
    navigator.geolocation.getCurrentPosition(
      (pos) => resolve({
        lat: pos.coords.latitude,
        lng: pos.coords.longitude,
        accuracy: Math.round(pos.coords.accuracy || 0),
      }),
      (err) => reject(err),
      { enableHighAccuracy: true, timeout, maximumAge: 60000 }
    );
  });
}

async function reverseGeocode(lat, lng) {
  const url = `https://nominatim.openstreetmap.org/reverse?format=jsonv2&lat=${lat}&lon=${lng}&zoom=12&addressdetails=1`;
  const r = await fetch(url, { headers: { Accept: "application/json" } });
  if (!r.ok) throw new Error("reverse geocode failed");
  const d = await r.json();
  const a = d.address || {};
  const district = a.state_district || a.county || a.district || a.city_district || a.city || a.town || a.village || "";
  const city = a.city || a.town || a.village || a.suburb || "";
  const state = a.state || "";
  const label = [district || city, state].filter(Boolean).join(", ") || d.display_name || "";
  return { district, city, state, label };
}

/**
 * Returns { lat, lng, accuracy, district, city, state, label } or null.
 * Safe to await directly in a check-in flow — won't throw.
 */
export async function getCurrentLocation() {
  try {
    const c = await getCoords();
    let geo = {};
    try { geo = await reverseGeocode(c.lat, c.lng); } catch { /* keep coords only */ }
    return { ...c, ...geo };
  } catch {
    return null;
  }
}
