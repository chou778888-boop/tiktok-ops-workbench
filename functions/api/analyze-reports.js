const headers = {
  "content-type": "application/json; charset=utf-8",
  "cache-control": "no-store"
};

function json(status, body) {
  return new Response(JSON.stringify(body), { status, headers });
}

function outputText(response) {
  return (response?.output || [])
    .filter((item) => item?.type === "message")
    .flatMap((item) => item.content || [])
    .filter((item) => item?.type === "output_text")
    .map((item) => item.text || "")
    .join("");
}

async function sha256(value) {
  const bytes = new TextEncoder().encode(value);
  const digest = await crypto.subtle.digest("SHA-256", bytes);
  return [...new Uint8Array(digest)].map((byte) => byte.toString(16).padStart(2, "0")).join("");
}

const analysisSchema = {
  type: "object",
  additionalProperties: false,
  properties: {
    executiveSummary: { type: "string" },
    dataConfidence: {
      type: "object",
      additionalProperties: false,
      properties: {
        level: { type: "string", enum: ["高", "中", "低"] },
        explanation: { type: "string" }
      },
      required: ["level", "explanation"]
    },
    diagnoses: {
      type: "array",
      minItems: 2,
      maxItems: 6,
      items: {
        type: "object",
        additionalProperties: false,
        properties: {
          severity: { type: "string", enum: ["紧急", "重要", "关注", "机会"] },
          dimension: { type: "string" },
          conclusion: { type: "string" },
          evidence: { type: "string" },
          action: { type: "string" },
          owner: { type: "string" },
          reviewMetric: { type: "string" }
        },
        required: ["severity", "dimension", "conclusion", "evidence", "action", "owner", "reviewMetric"]
      }
    },
    crossRoleSignals: {
      type: "array",
      maxItems: 4,
      items: { type: "string" }
    },
    nextWeekPriorities: {
      type: "array",
      minItems: 1,
      maxItems: 5,
      items: { type: "string" }
    },
    dataCaveats: {
      type: "array",
      maxItems: 5,
      items: { type: "string" }
    }
  },
  required: [
    "executiveSummary",
    "dataConfidence",
    "diagnoses",
    "crossRoleSignals",
    "nextWeekPriorities",
    "dataCaveats"
  ]
};

const systemPrompt = `
你是一名负责多店铺经营的 TikTok Shop 跨境电商运营总监。你的任务不是复述日报，而是基于证据完成经营诊断并给出可执行动作。

分析原则：
1. 使用“证据 → 判断 → 动作 → 负责人 → 复查指标”的闭环。
2. 同时观察增长规模、渠道结构、达人资产复利、广告与利润质量、商品和链接承接、VOC、履约与平台风险。
3. 优先识别跨岗位信号。
4. 区分领先指标和结果指标，不把寄样量直接当作最终产出。
5. 不虚构平台阈值、竞对数据、利润或因果关系；缺数据时明确指出。
6. 建议必须适合六店团队执行，优先给出一周内可验证的动作。
7. 风险结论只依据输入数据。
8. 使用简洁、专业的中文；保留 GMV、ROI、SPS、VOC 等业内常用缩写。
`;

export async function onRequest({ request, env }) {
  if (request.method !== "POST") return json(405, { error: "Method not allowed" });
  if (!env.OPENAI_API_KEY) {
    return json(503, {
      error: "AI_NOT_CONFIGURED",
      message: "请先在 Cloudflare 环境变量中配置 OPENAI_API_KEY。"
    });
  }

  const contentLength = Number(request.headers.get("content-length") || 0);
  if (contentLength > 220000) return json(413, { error: "Payload too large" });

  let payload;
  try {
    payload = await request.json();
  } catch {
    return json(400, { error: "Invalid JSON payload" });
  }

  if (!payload?.range?.start || !payload?.range?.end || !Array.isArray(payload?.reports)) {
    return json(400, { error: "Missing analysis data" });
  }

  const serialized = JSON.stringify(payload);
  if (serialized.length > 220000) return json(413, { error: "Payload too large" });

  const fingerprint = await sha256(serialized);
  const cached = await env.DB.prepare(
    "SELECT result FROM analysis_cache WHERE fingerprint = ?"
  ).bind(fingerprint).first();
  if (cached?.result) return json(200, { ...JSON.parse(cached.result), cached: true });

  const hour = new Date().toISOString().slice(0, 13);
  const address = request.headers.get("cf-connecting-ip")
    || request.headers.get("x-forwarded-for")?.split(",")[0]?.trim()
    || "unknown";
  const addressHash = (await sha256(address)).slice(0, 20);
  const rateKey = `${addressHash}:${hour}`;
  const now = new Date().toISOString();
  await env.DB.prepare(
    `INSERT INTO analysis_rate_limit (rate_key, count, updated_at)
     VALUES (?, 1, ?)
     ON CONFLICT(rate_key) DO UPDATE SET count = count + 1, updated_at = excluded.updated_at`
  ).bind(rateKey, now).run();
  const rate = await env.DB.prepare(
    "SELECT count FROM analysis_rate_limit WHERE rate_key = ?"
  ).bind(rateKey).first();
  if (Number(rate?.count || 0) > 12) {
    return json(429, { error: "RATE_LIMIT", message: "本小时分析次数已达上限，请稍后再试。" });
  }

  const model = env.OPENAI_MODEL || "gpt-5.6-terra";
  const response = await fetch("https://api.openai.com/v1/responses", {
    method: "POST",
    headers: {
      "authorization": `Bearer ${env.OPENAI_API_KEY}`,
      "content-type": "application/json"
    },
    body: JSON.stringify({
      model,
      reasoning: { effort: "medium" },
      store: false,
      input: [
        { role: "system", content: [{ type: "input_text", text: systemPrompt }] },
        {
          role: "user",
          content: [{
            type: "input_text",
            text: `请分析以下周度结构化经营数据。重点岗位：${payload.focusRole}。\n\n${serialized}`
          }]
        }
      ],
      text: {
        verbosity: "medium",
        format: {
          type: "json_schema",
          name: "tiktok_ops_weekly_analysis",
          strict: true,
          schema: analysisSchema
        }
      },
      max_output_tokens: 3600
    })
  });

  const responseBody = await response.json();
  if (!response.ok) {
    return json(response.status, {
      error: "OPENAI_ERROR",
      message: responseBody?.error?.message || "OpenAI analysis failed"
    });
  }

  let analysis;
  try {
    analysis = JSON.parse(outputText(responseBody));
  } catch {
    return json(502, { error: "INVALID_MODEL_OUTPUT", message: "模型返回内容无法解析。" });
  }

  const result = {
    analysis,
    model,
    fingerprint,
    createdAt: now,
    cached: false
  };
  await env.DB.prepare(
    "INSERT OR REPLACE INTO analysis_cache (fingerprint, result, created_at) VALUES (?, ?, ?)"
  ).bind(fingerprint, JSON.stringify(result), now).run();
  return json(200, result);
}
