const TIKTOK_AUTHORIZATION_HOSTS = new Set([
  "services.us.tiktokshop.com",
  "services.tiktokshops.us",
  "services.tiktokshop.com"
]);

function bytesToBase64Url(bytes) {
  let binary = "";
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary).replaceAll("+", "-").replaceAll("/", "_").replace(/=+$/g, "");
}

function base64UrlToBytes(value) {
  const base64 = String(value || "").replaceAll("-", "+").replaceAll("_", "/");
  const padded = `${base64}${"=".repeat((4 - base64.length % 4) % 4)}`;
  const binary = atob(padded);
  return Uint8Array.from(binary, (character) => character.charCodeAt(0));
}

async function credentialKey(secret) {
  const material = new TextEncoder().encode(String(secret || ""));
  if (material.length < 32) throw new Error("令牌加密密钥至少需要 32 个字符");
  const digest = await crypto.subtle.digest("SHA-256", material);
  return crypto.subtle.importKey("raw", digest, { name: "AES-GCM" }, false, ["encrypt", "decrypt"]);
}

export async function encryptTikTokCredential(value, secret, { randomBytes, context = "" } = {}) {
  const iv = randomBytes ? randomBytes(12) : crypto.getRandomValues(new Uint8Array(12));
  if (!(iv instanceof Uint8Array) || iv.length !== 12) throw new Error("令牌加密随机数无效");
  const encrypted = await crypto.subtle.encrypt(
    { name: "AES-GCM", iv, additionalData: new TextEncoder().encode(String(context)) },
    await credentialKey(secret),
    new TextEncoder().encode(String(value || ""))
  );
  return `v1.${bytesToBase64Url(iv)}.${bytesToBase64Url(new Uint8Array(encrypted))}`;
}

export async function decryptTikTokCredential(value, secret, { context = "" } = {}) {
  const [version, ivText, encryptedText] = String(value || "").split(".");
  if (version !== "v1" || !ivText || !encryptedText) throw new Error("无法解密 TikTok 授权令牌");
  try {
    const decrypted = await crypto.subtle.decrypt(
      {
        name: "AES-GCM",
        iv: base64UrlToBytes(ivText),
        additionalData: new TextEncoder().encode(String(context))
      },
      await credentialKey(secret),
      base64UrlToBytes(encryptedText)
    );
    return new TextDecoder().decode(decrypted);
  } catch {
    throw new Error("无法解密 TikTok 授权令牌");
  }
}

export function buildTikTokSellerAuthorizationUrl({ authorizationUrl, state } = {}) {
  let url;
  try {
    url = new URL(String(authorizationUrl || ""));
  } catch {
    throw new Error("TikTok 官方授权地址无效");
  }
  if (url.protocol !== "https:" || !TIKTOK_AUTHORIZATION_HOSTS.has(url.hostname) || url.pathname !== "/open/authorize") {
    throw new Error("TikTok 官方授权地址无效");
  }
  if (!url.searchParams.get("service_id") || !state) throw new Error("TikTok 官方授权地址缺少必要参数");
  url.searchParams.set("state", String(state));
  return url.toString();
}

function normalizedToken(data = {}) {
  return {
    accessToken: String(data.access_token || ""),
    refreshToken: String(data.refresh_token || ""),
    accessTokenExpiresAt: Number(data.access_token_expire_in || 0) || null,
    refreshTokenExpiresAt: Number(data.refresh_token_expire_in || 0) || null,
    openId: String(data.open_id || ""),
    userType: data.user_type === undefined ? null : Number(data.user_type),
    grantedScopes: Array.isArray(data.granted_scopes)
      ? data.granted_scopes.map(String)
      : Array.isArray(data.granted_permissions) ? data.granted_permissions.map(String) : []
  };
}

async function tokenRequest(path, query, fetchImpl) {
  const url = new URL(path, "https://auth.tiktok-shops.com");
  Object.entries(query).forEach(([key, value]) => url.searchParams.set(key, String(value || "")));
  const response = await fetchImpl(url, {
    method: "GET",
    headers: { accept: "application/json" }
  });
  let payload;
  try {
    payload = await response.json();
  } catch {
    throw Object.assign(new Error("TikTok 授权服务返回无效响应"), { code: "TIKTOK_AUTH_ERROR" });
  }
  if (!response.ok || Number(payload?.code) !== 0) {
    throw Object.assign(new Error(`TikTok 授权失败：${String(payload?.message || `HTTP ${response.status}`).slice(0, 160)}`), {
      code: "TIKTOK_AUTH_ERROR",
      platformCode: payload?.code ?? null
    });
  }
  const token = normalizedToken(payload.data || {});
  if (!token.accessToken || !token.refreshToken) {
    throw Object.assign(new Error("TikTok 授权响应缺少令牌"), { code: "TIKTOK_AUTH_ERROR" });
  }
  return token;
}

export function exchangeTikTokAuthorizationCode({ appKey, appSecret, authCode, fetchImpl = fetch } = {}) {
  return tokenRequest("/api/v2/token/get", {
    app_key: appKey,
    app_secret: appSecret,
    auth_code: authCode,
    grant_type: "authorized_code"
  }, fetchImpl);
}

export function refreshTikTokAuthorizationToken({ appKey, appSecret, refreshToken, fetchImpl = fetch } = {}) {
  return tokenRequest("/api/v2/token/refresh", {
    app_key: appKey,
    app_secret: appSecret,
    refresh_token: refreshToken,
    grant_type: "refresh_token"
  }, fetchImpl);
}
