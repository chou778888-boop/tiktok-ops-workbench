import { publicUser } from "./auth.js";

export function workbenchPayload(user, state, normalizeData) {
  const normalizedData = typeof normalizeData === "function" ? normalizeData : (value) => value || {};
  return {
    user: publicUser(user),
    version: state?.version || "v2",
    updatedAt: state?.updated_at || null,
    revision: Number(state?.revision || 0),
    data: state?.data ? normalizedData(JSON.parse(state.data)) : normalizedData(null)
  };
}
