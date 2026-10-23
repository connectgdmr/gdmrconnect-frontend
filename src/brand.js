// Sales-demo build switch. Normal builds leave VITE_BRAND unset, so none of this is active.
// The Aieque demo deployment sets VITE_BRAND=aieque (see vite.config.js for the text/logo/currency swap).
export const IS_DEMO = import.meta.env.VITE_BRAND === "aieque";

export const DEMO_PASSWORD = "Demo@12345";
export const DEMO_ACCOUNTS = [
  { role: "Admin / Owner", who: "Sarah Mitchell · Managing Director", email: "admin@aieque-demo.com" },
  { role: "Manager",       who: "Omar Al Farsi · Head of Operations", email: "manager@aieque-demo.com" },
  { role: "Employee",      who: "Aisha Khan · Filing Specialist",     email: "employee@aieque-demo.com" },
];
