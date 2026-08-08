/**
 * Production origin allowlist derived from FRONTEND_URL.
 * Never use wildcard CORS for authenticated / server-function traffic.
 */

function normalizeOrigin(value: string | undefined | null): string | null {
  if (!value) return null;
  const trimmed = value.trim().replace(/\/$/, "");
  if (!trimmed) return null;
  try {
    return new URL(trimmed).origin;
  } catch {
    return null;
  }
}

/** Origins allowed for server-function CSRF / Origin checks. */
export function allowedFrontendOrigins(requestUrl: string): string[] {
  const origins = new Set<string>();
  try {
    origins.add(new URL(requestUrl).origin);
  } catch {
    /* ignore malformed request URL */
  }
  const configured = normalizeOrigin(process.env["FRONTEND_URL"]);
  if (configured) origins.add(configured);
  return [...origins];
}

export function isAllowedFrontendOrigin(
  originHeader: string | null | undefined,
  requestUrl: string,
): boolean {
  if (!originHeader) return false;
  const allowed = allowedFrontendOrigins(requestUrl);
  return allowed.includes(originHeader);
}
