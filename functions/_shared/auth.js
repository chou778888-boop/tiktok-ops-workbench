const sessionCookieName = "tiktok_ops_session";

function bytesToHex(bytes) {
  return [...new Uint8Array(bytes)].map((value) => value.toString(16).padStart(2, "0")).join("");
}

function hexToBytes(value) {
  const hex = String(value || "");
  if (!/^[a-f0-9]+$/i.test(hex) || hex.length % 2) return new Uint8Array();
  return new Uint8Array(hex.match(/.{2}/g).map((part) => Number.parseInt(part, 16)));
}

export async function sha256Hex(value) {
  return bytesToHex(await crypto.subtle.digest("SHA-256", new TextEncoder().encode(String(value || ""))));
}

export async function passwordHash(password, salt, iterations) {
  const key = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(String(password || "")),
    "PBKDF2",
    false,
    ["deriveBits"]
  );
  return bytesToHex(await crypto.subtle.deriveBits({
    name: "PBKDF2",
    hash: "SHA-256",
    salt: hexToBytes(salt),
    iterations: Number(iterations || 210000)
  }, key, 256));
}

export function constantTimeEqual(left, right) {
  const a = hexToBytes(left);
  const b = hexToBytes(right);
  if (!a.length || a.length !== b.length) return false;
  let difference = 0;
  for (let index = 0; index < a.length; index += 1) difference |= a[index] ^ b[index];
  return difference === 0;
}

export function sessionToken() {
  const bytes = crypto.getRandomValues(new Uint8Array(32));
  return bytesToHex(bytes);
}

export function requestSessionToken(request) {
  const cookie = request.headers.get("cookie") || "";
  const match = cookie.match(new RegExp(`(?:^|;\\s*)${sessionCookieName}=([^;]+)`));
  return match ? decodeURIComponent(match[1]) : "";
}

export function sessionCookie(token, request, maxAge = 604800) {
  const secure = new URL(request.url).protocol === "https:" ? "; Secure" : "";
  return `${sessionCookieName}=${encodeURIComponent(token)}; Path=/; HttpOnly; SameSite=Strict; Max-Age=${maxAge}${secure}`;
}

export function publicUser(row) {
  return row ? {
    id: row.id,
    username: row.username,
    name: row.display_name,
    role: row.role
  } : null;
}
