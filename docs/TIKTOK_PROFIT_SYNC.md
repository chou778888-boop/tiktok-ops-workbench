# TikTok 利润自动同步

利润中心通过 TikTok Shop Open API 抓取订单、SKU 销售与财务结算，通过 TikTok Marketing API 抓取广告实付费用。同步只增量覆盖同一“链接 / SKU / 经营日”的平台字段，不删除工作台已有产品、链接、寄样费、内部调整或历史数据。

## 数据口径

- 订单与 SKU：按店铺经营时区的完整自然日抓取，生成 GMV、件数、订单数和成交均价。
- 实际到手：仅已结算的 Finance v202501 数据写入 `actualReceived` / `settlementAmount`；未结算的 v202507 数据只写预估到手。
- 产品成本：继续来自工作台产品主档和生效日成本，不从平台重复抓取。
- 广告费：优先使用 Marketing API 的 `billed_cost`，按明确的广告、广告组或计划映射到链接；没有映射时不猜测、不写零覆盖人工费用。
- 容错：单店失败不丢弃其他店铺结果；广告失败不丢弃同店订单和结算结果，状态显示为“部分同步”。

## Pages 生产环境 Secrets

在 Cloudflare Pages 项目中配置以下加密变量，禁止提交真实令牌到仓库：

- `TIKTOK_SHOP_APP_KEY`
- `TIKTOK_SHOP_APP_SECRET`
- `TIKTOK_SHOP_AUTHORIZATION_URL`（Partner Center 中复制的 Seller Authorization Link）
- `TK_TOKEN_ENCRYPTION_KEY`（独立随机密钥，至少 32 个字符）
- `TIKTOK_SHOP_CONNECTIONS`
- `TIKTOK_ADS_ACCESS_TOKEN`（未接广告账户时可暂不配置）
- `TK_SYNC_SECRET`

`TIKTOK_SHOP_CONNECTIONS` 使用 JSON 数组：

```json
[
  {
    "id": "us-store-1",
    "storeId": "工作台中的 profitStores.id",
    "storeTimezone": "America/Los_Angeles",
    "advertiserId": "广告账户 ID",
    "adMappings": [
      {
        "adId": "TikTok Ads ad_id",
        "platformListingId": "TikTok Shop product_id"
      }
    ]
  }
]
```

一键授权版的 `TIKTOK_SHOP_CONNECTIONS` 只保存非敏感的时区和广告映射。TikTok Shop access token / refresh token 由回调服务使用 AES-256-GCM 加密后写入 `tiktok_shop_connections`，不得再手工写入配置。

## 一键连接店铺

1. 在 TikTok Shop Partner Center 的应用设置中，将 Redirect URL 配置为：

   `https://tiktok-ops-workbench.pages.dev/api/tiktok-shop/authorization/callback`

2. 在 `Manage API` 中只启用订单搜索、店铺授权信息、Finance Statements、Statement Transactions 和 Unsettled Transactions 等同步所需权限。
3. 部署前应用迁移：

   ```sh
   npx wrangler d1 execute tiktok-ops-workbench --remote --file=migrations/0004_tiktok_shop_authorization.sql
   ```

4. 管理员进入“利润与成本 → 链接利润”。只有一个利润店铺时直接点击“连接店铺”；存在多个利润店铺时，必须先在上方选择目标店铺，再点击连接。
5. 浏览器只允许跳转到 TikTok 官方授权域名。授权成功后回到工作台，授权码立即作废，令牌不会返回浏览器。

安全约束：OAuth state 仅保存 SHA-256 哈希、绑定管理员与工作台店铺、10 分钟过期且只能消费一次；多平台店铺返回时禁止自动猜测映射；D1 中只保存 AES-GCM 密文，解密密钥仅存 Cloudflare Secret。

工作台中的 `profitListings.platformListingId` 和 `profitListingSkus.platformSkuId` 必须先对应平台 `product_id`、`sku_id`。未知链接或 SKU 只进入同步诊断，不自动创建错误产品。

## 每日 17:00 定时任务

定时 Worker 配置位于 `wrangler.profit-sync.jsonc`，Cron `0 9 * * *` 对应北京时间 17:00。Scheduler 与 Pages 必须配置同一个 `TK_SYNC_SECRET`：

```sh
npx wrangler secret put TK_SYNC_SECRET --config wrangler.profit-sync.jsonc
npm run deploy:profit-sync
```

首次上线前先运行：

```sh
npm run predeploy:check
```

页面“立即同步”仅管理员可用，调用同一服务并在成功后强制刷新统一云端状态。定时任务和人工触发使用相同的幂等 ID，重复同步同一天不会生成重复记录。
