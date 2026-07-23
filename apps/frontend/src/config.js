// Single source of truth for the backend base URL. Every component imports
// API_URL from here — do not re-read import.meta.env elsewhere, or the fallback
// drifts (it previously ranged 8000/8081 across four files).
//
// VITE_API_BASE_URL is inlined by Vite AT BUILD TIME, so it must be set in the
// Amplify build environment, not only in a local .env. If it is missing in a
// production build, the app silently falls back to localhost and every request
// fails — so we surface that loudly in the console.
const FALLBACK = 'http://127.0.0.1:8000/api';
export const API_URL = import.meta.env.VITE_API_BASE_URL || FALLBACK;

if (!import.meta.env.VITE_API_BASE_URL && import.meta.env.PROD) {
  // eslint-disable-next-line no-console
  console.error(
    '[config] VITE_API_BASE_URL is not set for this production build. ' +
    'Falling back to ' + FALLBACK + ', which will not work in the browser. ' +
    'Set it in the Amplify console (App settings -> Environment variables) and redeploy.'
  );
}
