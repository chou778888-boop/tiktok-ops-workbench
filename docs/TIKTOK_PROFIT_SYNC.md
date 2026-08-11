# 利润自动同步

利润中心通过 TK 工作台的独立 E仓应用只读同步 TikTok 销售订单和 SKU 销售数据。同步只增量覆盖同一“链接 / SKU / 经营日”的销量、订单数、GMV 与成交均价，不删除工作台已有产品、链接、费用、内部调整或历史数据。

E仓请求只发生在每日 17:00 定时同步或管理员点击“立即同步”时。登录、首屏和页面切换只读取 D1 中已同步的结果，不会等待 E仓实时返回。

## 数据口径

- 订单与 SKU：按店铺经营时区的完整自然日抓取，通过 E仓 `user_account` + 平台链接 + Seller SKU 映射，生成 GMV、件数、订单数和成交均价。
- 权限边界：客户端只暴露 E仓 `getOrderList` 查询能力，不调用库存、采购、物流、成本、财务或任何新增/修改/删除接口。
- 利润口径：E仓同步不写实际到手、平台费用、运费、广告费或产品成本；这些字段保留工作台原有数据及后续独立数据源，不以订单字段猜测。
- 容错：单店失败不丢弃其他店铺结果；未映射链接或 SKU 只进入诊断，不自动创建错误产品。

## Pages 生产环境 Secrets

在 Cloudflare Pages 项目中配置以下加密变量，禁止提交真实令牌到仓库：

E仓主数据源：

- `ECCANG_APP_ISOLATION=dedicated`（生产隔离确认开关；缺失或值不同会直接阻断 E仓同步）
- `ECCANG_APP_KEY`（TK 工作台独立 E仓应用的 App Key）
- `ECCANG_APP_SECRET`（TK 工作台独立 E仓应用的 App Secret）
- `ECCANG_SERVICE_ID`（该应用授权状态页面中的服务 ID）
- `ECCANG_CONNECTIONS`（非密钥的店铺映射 JSON）
- `TK_SYNC_SECRET`

`ECCANG_CONNECTIONS` 必须明确绑定工作台店铺和 E仓店铺账号，不使用模糊名称自动猜测：

```json
[
  {
    "id": "eccang-dreamweave",
    "storeId": "工作台中的 profitStores.id",
    "userAccount": "E仓 user_account 精确值",
    "storeTimezone": "America/Los_Angeles"
  }
]
```

生产安全边界：不复用“帆软数跨境”的密钥、调用配额、IP 白名单或审计链路；独立应用只申请销售订单查询权限与独立服务 ID。即使误填了旧应用密钥，缺少独立应用隔离开关时同步路由也会拒绝执行，且不会降级调用其他数据源。调用只允许发往 `eccang.com` 官方 HTTPS 域名；密钥仅存 Cloudflare Secret，不返回浏览器。

TikTok 补充数据源（未配置 E仓时仍可独立使用）：

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
