export function createTikTokShopConnectionRepository(db) {
  return {
    async storeExists(storeId) {
      const row = await db.prepare("SELECT data FROM workbench_state WHERE id = ?").bind("main").first();
      if (!row?.data) return false;
      try {
        const data = JSON.parse(row.data);
        return Array.isArray(data.profitStores) && data.profitStores.some((store) => String(store?.id || "") === storeId);
      } catch {
        return false;
      }
    },

    async createState({ stateHash, userId, storeId, expiresAt, createdAt }) {
      await db.prepare("DELETE FROM tiktok_shop_oauth_states WHERE expires_at <= ? OR used_at IS NOT NULL").bind(createdAt).run();
      await db.prepare(`
        INSERT INTO tiktok_shop_oauth_states (state_hash, user_id, store_id, expires_at, created_at, used_at)
        VALUES (?, ?, ?, ?, ?, NULL)
      `).bind(stateHash, userId, storeId, expiresAt, createdAt).run();
    },

    async consumeState({ stateHash, consumedAt }) {
      return db.prepare(`
        UPDATE tiktok_shop_oauth_states
        SET used_at = ?
        WHERE state_hash = ? AND used_at IS NULL AND expires_at > ?
        RETURNING user_id, store_id
      `).bind(consumedAt, stateHash, consumedAt).first();
    },

    async saveConnection(connection) {
      await db.prepare(`
        INSERT INTO tiktok_shop_connections (
          store_id, shop_id, shop_cipher, shop_name, shop_region,
          access_token_cipher, refresh_token_cipher,
          access_token_expires_at, refresh_token_expires_at,
          granted_scopes, status, authorized_by, created_at, updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'active', ?, ?, ?)
        ON CONFLICT(store_id) DO UPDATE SET
          shop_id = excluded.shop_id,
          shop_cipher = excluded.shop_cipher,
          shop_name = excluded.shop_name,
          shop_region = excluded.shop_region,
          access_token_cipher = excluded.access_token_cipher,
          refresh_token_cipher = excluded.refresh_token_cipher,
          access_token_expires_at = excluded.access_token_expires_at,
          refresh_token_expires_at = excluded.refresh_token_expires_at,
          granted_scopes = excluded.granted_scopes,
          status = 'active',
          authorized_by = excluded.authorized_by,
          updated_at = excluded.updated_at
      `).bind(
        connection.storeId,
        connection.shopId,
        connection.shopCipher,
        connection.shopName,
        connection.shopRegion,
        connection.accessTokenCipher,
        connection.refreshTokenCipher,
        connection.accessTokenExpiresAt,
        connection.refreshTokenExpiresAt,
        JSON.stringify(connection.grantedScopes || []),
        connection.authorizedBy,
        connection.createdAt,
        connection.updatedAt
      ).run();
    },

    async listActiveConnections() {
      const result = await db.prepare(`
        SELECT store_id, shop_id, shop_cipher, shop_name, shop_region,
          access_token_cipher, refresh_token_cipher,
          access_token_expires_at, refresh_token_expires_at,
          granted_scopes, status
        FROM tiktok_shop_connections
        WHERE status = 'active'
      `).all();
      return Array.isArray(result.results) ? result.results : [];
    },

    async updateTokens(storeId, token) {
      await db.prepare(`
        UPDATE tiktok_shop_connections
        SET access_token_cipher = ?, refresh_token_cipher = ?,
          access_token_expires_at = ?, refresh_token_expires_at = ?,
          granted_scopes = ?, updated_at = ?
        WHERE store_id = ? AND status = 'active'
      `).bind(
        token.accessTokenCipher,
        token.refreshTokenCipher,
        token.accessTokenExpiresAt,
        token.refreshTokenExpiresAt,
        JSON.stringify(token.grantedScopes || []),
        token.updatedAt,
        storeId
      ).run();
    }
  };
}
