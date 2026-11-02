// Gateway de IA (secao 8.2): uma camada propria que chama o provedor.
// Trocar de provedor e configuracao (.env), nao reescrita.
// Provedores aceitos: "groq" | "openrouter" | "anthropic". Sem chave => null (o app usa o modo local).
import { db } from "./db";

type Msg = { role: "system" | "user" | "assistant"; content: string | any[] };

const cfg = () => {
  const p = (process.env.AI_PROVIDER || "groq").toLowerCase();
  if (p === "anthropic") return { p, key: process.env.ANTHROPIC_API_KEY, text: process.env.ANTHROPIC_MODEL || "claude-sonnet-5-5", vision: process.env.ANTHROPIC_MODEL || "claude-sonnet-5-5" };
  if (p === "openrouter") return { p, key: process.env.OPENROUTER_API_KEY, url: "https://openrouter.ai/api/v1/chat/completions", text: process.env.OPENROUTER_TEXT_MODEL || "meta-llama/llama-3.3-70b-instruct:free", vision: process.env.OPENROUTER_VISION_MODEL || "meta-llama/llama-4-scout:free" };
  return { p: "groq", key: process.env.GROQ_API_KEY, url: "https://api.groq.com/openai/v1/chat/completions", text: process.env.GROQ_TEXT_MODEL || "llama-3.3-70b-versatile", vision: process.env.GROQ_VISION_MODEL || "meta-llama/llama-4-scout-17b-16e-instruct" };
};

export const aiEnabled = () => Boolean(cfg().key);
export const aiProvider = () => cfg().p;

async function call(messages: Msg[], opts: { vision?: boolean; json?: boolean; maxTokens?: number }) {
  const c = cfg();
  if (!c.key) return null;
  const model = opts.vision ? c.vision : c.text;
  if (c.p === "anthropic") {
    const system = messages.filter((m) => m.role === "system").map((m) => m.content).join("\n");
    const body = {
      model, max_tokens: opts.maxTokens ?? 1024, system,
      messages: messages.filter((m) => m.role !== "system").map((m) => ({
        role: m.role,
        content: typeof m.content === "string" ? m.content : m.content.map((p: any) => p.type === "image_url"
          ? (() => { const [, mt, data] = p.image_url.url.match(/^data:(.+?);base64,(.+)$/); return mt === "application/pdf"
              ? { type: "document", source: { type: "base64", media_type: mt, data } }
              : { type: "image", source: { type: "base64", media_type: mt, data } }; })()
          : { type: "text", text: p.text }),
      })),
    };
    const r = await fetch("https://api.anthropic.com/v1/messages", { method: "POST", headers: { "x-api-key": c.key, "anthropic-version": "2023-06-01", "content-type": "application/json" }, body: JSON.stringify(body) });
    if (!r.ok) throw new Error(`IA ${r.status}: ${(await r.text()).slice(0, 200)}`);
    const j = await r.json();
    return { text: j.content?.map((b: any) => b.text ?? "").join("") ?? "", tokens: (j.usage?.input_tokens ?? 0) + (j.usage?.output_tokens ?? 0) };
  }
  const r = await fetch(c.url!, {
    method: "POST",
    headers: { authorization: `Bearer ${c.key}`, "content-type": "application/json" },
    body: JSON.stringify({ model, messages, temperature: 0.2, max_tokens: opts.maxTokens ?? 1024, ...(opts.json ? { response_format: { type: "json_object" } } : {}) }),
  });
  if (!r.ok) throw new Error(`IA ${r.status}: ${(await r.text()).slice(0, 200)}`);
  const j = await r.json();
  return { text: j.choices?.[0]?.message?.content ?? "", tokens: j.usage?.total_tokens ?? 0 };
}

function extractJson(text: string) {
  const m = text.match(/\{[\s\S]*\}/);
  if (!m) throw new Error("IA nao retornou JSON");
  return JSON.parse(m[0]);
}

async function track(userId: string, kind: string, tokens: number) {
  await db.aiUsage.create({ data: { userId, kind, provider: cfg().p, tokens } }).catch(() => {});
}

export async function aiJson<T = any>(userId: string, kind: string, system: string, user: string | any[], vision = false): Promise<T | null> {
  const res = await call([{ role: "system", content: system }, { role: "user", content: user }], { vision, json: true, maxTokens: 1500 });
  if (!res) return null;
  await track(userId, kind, res.tokens);
  return extractJson(res.text);
}

export async function aiText(userId: string, kind: string, messages: Msg[]): Promise<string | null> {
  const res = await call(messages, { maxTokens: 700 });
  if (!res) return null;
  await track(userId, kind, res.tokens);
  return res.text;
}
