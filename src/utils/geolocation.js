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

/**
 * Mandatory version — throws with a user-friendly message if location is
 * denied, unavailable, or unsupported. Use this for attendance check-in/out
 * where location is required.
 */
export async function requireLocation() {
  if (typeof navigator === "undefined" || !navigator.geolocation) {
    throw new Error(
      "Location services are not supported by your browser. Please use a modern browser (Chrome, Safari, Firefox) to mark attendance."
    );
  }

  let coords;
  try {
    coords = await getCoords(12000);
  } catch (err) {
    const code = err?.code;
    if (code === 1) {
      throw new Error(
        "Location permission was denied.\n\nTo mark attendance you must allow location access:\n• Mobile: tap the lock/info icon in your browser address bar → Site settings → Location → Allow\n• Desktop: click the location icon in the address bar and select Allow"
      );
    } else if (code === 2) {
      throw new Error(
        "Your location could not be determined. Please make sure location/GPS is enabled on your device and try again."
      );
    } else if (code === 3) {
      throw new Error(
        "Location request timed out. Please ensure location services are enabled and you have a GPS or network signal, then try again."
      );
    }
    throw new Error("Could not get your location. Please allow location access and try again.");
  }

  let geo = {};
  try { geo = await reverseGeocode(coords.lat, coords.lng); } catch { /* coords only is fine */ }
  return { ...coords, ...geo };
}
