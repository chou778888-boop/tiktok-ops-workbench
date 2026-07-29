import { createHash } from "node:crypto";
import { getStore } from "@netlify/blobs";

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

function clientAddress(request) {
  return request.headers.get("x-nf-client-connection-ip")
    || request.headers.get("x-forwarded-for")?.split(",")[0]?.trim()
    || "unknown";
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
  required: ["executiveSummary", "dataConfidence", "diagnoses", "crossRoleSignals", "nextWeekPriorities", "dataCaveats"]
};

const systemPrompt = `
你是一名负责多店铺经营的 TikTok Shop 跨境电商运营总监。你的任务不是复述日报，而是基于证据完成经营诊断并给出可执行动作。

分析原则：
1. 使用“证据 → 判断 → 动作 → 负责人 → 复查指标”的闭环。
2. 同时观察增长规模、渠道结构、达人资产复利、广告与利润质量、商品和链接承接、VOC、履约与平台风险。
3. 优先识别跨岗位信号，例如达人GMV增长但退货和差评同步上升、寄样增加但发布未增长、广告ROI下降且商品卡承接不足。
4. 区分领先指标和结果指标；当期寄样/发布等比值不是严格同批次转化率，必须注明口径限制。
5. 不虚构平台阈值、竞对数据、利润或因果关系。缺少成本、流量、点击率、转化率或同期数据时，明确指出缺口。
6. 建议必须适合六店团队执行，优先给出一周内可验证的动作，不写空泛口号。
7. 风险相关结论只依据输入数据，不擅自引用可能变化的平台规则。
8. 使用简洁、专业的中文；保留 GMV、ROI、SPS、VOC 等业内常用缩写。
`;

export default async (request) => {
  if (request.method !== "POST") return json(405, { error: "Method not allowed" });

  const apiKey = Netlify.env.get("OPENAI_API_KEY");
  if (!apiKey) {
    return json(503, {
      error: "AI_NOT_CONFIGURED",
      message: "请先在 Netlify 环境变量中配置 OPENAI_API_KEY。"
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

  const store = getStore("tiktok-ops-ai");
  const fingerprint = createHash("sha256").update(serialized).digest("hex");
  const cached = await store.get(`analysis:${fingerprint}`, { type: "json" });
  if (cached) return json(200, { ...cached, cached: true });

  const hour = new Date().toISOString().slice(0, 13);
  const addressHash = createHash("sha256").update(clientAddress(request)).digest("hex").slice(0, 20);
  const rateKey = `rate:${addressHash}:${hour}`;
  const rate = await store.get(rateKey, { type: "json" }) || { count: 0 };
  if (rate.count >= 12) {
    return json(429, { error: "RATE_LIMIT", message: "本小时分析次数已达上限，请稍后再试。" });
  }
  await store.setJSON(rateKey, { count: rate.count + 1, updatedAt: new Date().toISOString() });

  const model = Netlify.env.get("OPENAI_MODEL") || "gpt-5.6-terra";
  const response = await fetch("https://api.openai.com/v1/responses", {
    method: "POST",
    headers: {
      "authorization": `Bearer ${apiKey}`,
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
    const message = responseBody?.error?.message || "OpenAI analysis failed";
    return json(response.status, { error: "OPENAI_ERROR", message });
  }

  const text = outputText(responseBody);
  let analysis;
  try {
    analysis = JSON.parse(text);
  } catch {
    return json(502, { error: "INVALID_MODEL_OUTPUT", message: "模型返回内容无法解析。" });
  }

  const result = {
    analysis,
    model,
    fingerprint,
    createdAt: new Date().toISOString(),
    cached: false
  };
  await store.setJSON(`analysis:${fingerprint}`, result);
  return json(200, result);
};
