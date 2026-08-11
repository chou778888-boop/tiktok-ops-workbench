export function automationAuthorized(request, env) {
  const expected = String(env?.TK_SYNC_SECRET || "");
  const authorization = String(request?.headers?.get("authorization") || "");
  const actual = authorization.startsWith("Bearer ") ? authorization.slice(7) : "";
  if (!expected || !actual) return false;
  const length = Math.max(expected.length, actual.length);
  let difference = expected.length ^ actual.length;
  for (let index = 0; index < length; index += 1) {
    difference |= (expected.charCodeAt(index) || 0) ^ (actual.charCodeAt(index) || 0);
  }
  return difference === 0;
}
