// Demo-build switch. Normal builds leave VITE_BRAND unset, so none of this is active.
// The aieque demo deployment sets VITE_BRAND=aieque (see vite.config.js for the text/logo/currency swap);
// in that build the sidebar is trimmed to the core modules and the chat / AI assistant are hidden.
export const IS_DEMO = import.meta.env.VITE_BRAND === "aieque";
