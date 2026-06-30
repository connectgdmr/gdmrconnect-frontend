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
 *
 * Uses the Permissions API to check the current state first:
 *  - "prompt"  → browser will show the allow/deny popup again ✓
 *  - "granted" → proceeds without any popup ✓
 *  - "denied"  → browser silently rejects; we throw early with reset instructions
 */
export async function requireLocation() {
  if (typeof navigator === "undefined" || !navigator.geolocation) {
    throw new Error(
      "Location services are not supported by your browser. Please use Chrome, Safari, or Firefox to mark attendance."
    );
  }

  // Pre-flight: check if the permission is already permanently blocked.
  // When state === "denied" the browser will NOT show the popup on the next
  // getCurrentPosition call — it rejects silently. Detect this early so we
  // can show clear reset instructions instead of a confusing silent failure.
  if (navigator.permissions) {
    try {
      const { state } = await navigator.permissions.query({ name: "geolocation" });
      if (state === "denied") {
        throw new Error(
          "Location is blocked for this site. You must re-enable it manually:\n\n" +
          "Android (Chrome): Tap the lock icon in the address bar → Site settings → Location → Allow\n" +
          "iPhone (Safari): Settings → Privacy → Location Services → Safari Websites → While Using\n" +
          "Desktop (Chrome): Click the lock icon in the address bar → Location → Allow\n" +
          "Desktop (Firefox): Click the shield icon → Allow Location\n\n" +
          "After enabling, tap Check In again."
        );
      }
      // state === "prompt"  → popup will appear when getCurrentPosition is called ✓
      // state === "granted" → no popup needed, proceeds directly ✓
    } catch (permErr) {
      // Re-throw only our own error; if Permissions API itself failed, fall through
      if (permErr.message.startsWith("Location is blocked")) throw permErr;
    }
  }

  let coords;
  try {
    coords = await getCoords(12000);
  } catch (err) {
    const code = err?.code;
    if (code === 1) {
      throw new Error(
        "Location permission was denied.\n\n" +
        "To mark attendance you must allow location access:\n" +
        "• Mobile: tap the lock icon in the address bar → Site settings → Location → Allow\n" +
        "• Desktop: click the location icon in the address bar → Allow\n\n" +
        "Tap Check In again after allowing."
      );
    }
    if (code === 2) {
      throw new Error(
        "Your location could not be determined. Please make sure GPS / Location Services is turned on for your device and try again."
      );
    }
    if (code === 3) {
      throw new Error(
        "Location request timed out. Please ensure Location Services is enabled and you have a GPS or network signal, then try again."
      );
    }
    throw new Error("Could not get your location. Please allow location access and try again.");
  }

  let geo = {};
  try { geo = await reverseGeocode(coords.lat, coords.lng); } catch { /* coords only is fine */ }
  return { ...coords, ...geo };
}
