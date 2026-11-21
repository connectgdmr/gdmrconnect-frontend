// Demo-build switch. Normal builds leave VITE_BRAND unset, so none of this is active.
// The aieque demo deployment sets VITE_BRAND=aieque (see vite.config.js for the text/logo/currency swap);
// in that build the sidebar is trimmed to the core modules and the chat / AI assistant are hidden.
export const IS_DEMO = import.meta.env.VITE_BRAND === "aieque";

// aieque demo: dates are written day/month/year in the UAE, so every default-locale date shown on screen uses en-GB.
if (IS_DEMO && typeof Date !== "undefined" && !Date.prototype.__gbPatched) {
  const wrap = (name) => {
    const orig = Date.prototype[name];
    Date.prototype[name] = function (locale, opts) { return orig.call(this, locale === undefined ? "en-GB" : locale, opts); };
  };
  wrap("toLocaleDateString"); wrap("toLocaleString");
  Date.prototype.__gbPatched = true;
}
