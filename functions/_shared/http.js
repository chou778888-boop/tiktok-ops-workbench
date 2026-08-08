const trustedDevOrigins = new Set([
  "http://127.0.0.1:8792",
  "http://localhost:8792",
  "http://127.0.0.1:8796",
  "http://localhost:8796"
]);

export function corsHeaders(request, methods = "GET, POST, OPTIONS") {
  const headers = {};
  const origin = request?.headers?.get("origin") || "";
  const requestOrigin = request?.url ? new URL(request.url).origin : "";
  if (origin && (origin === requestOrigin || trustedDevOrigins.has(origin))) {
    headers["access-control-allow-origin"] = origin;
    headers["access-control-allow-methods"] = methods;
    headers["access-control-allow-headers"] = "accept, content-type";
    headers.vary = "Origin";
  }
  return headers;
}

export function apiSecurityHeaders() {
  return {
    "x-content-type-options": "nosniff",
    "referrer-policy": "no-referrer",
    "permissions-policy": "camera=(), microphone=(), geolocation=(), payment=(), usb=()"
  };
}

export function trustedMutationRequest(request) {
  const origin = request.headers.get("origin") || "";
  const requestOrigin = new URL(request.url).origin;
  if (origin && origin !== requestOrigin && !trustedDevOrigins.has(origin)) return false;
  const fetchSite = request.headers.get("sec-fetch-site") || "";
  return fetchSite !== "cross-site";
}

export function requestBodyWithinLimit(request, maxBytes) {
  const contentLength = Number(request.headers.get("content-length") || 0);
  return !Number.isFinite(contentLength) || contentLength <= 0 || contentLength <= maxBytes;
}
