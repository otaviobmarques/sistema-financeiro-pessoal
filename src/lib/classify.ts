// Motor de classificacao em camadas (RF-041):
// (1) regras do usuario, (2) historico do estabelecimento/CNPJ, (3) base global de palavras-chave, (4) IA.
import { db } from "./db";
import { DEFAULT_CATEGORIES, FALLBACK_EXPENSE, FALLBACK_INCOME } from "./categories";
import { keyOf, normalizeMerchant } from "./normalize";
import { aiEnabled, aiJson } from "./ai";

export type Classification = { categoryId: string | null; confidence: number; source: "regra" | "historico" | "base" | "ia" | "padrao" };

const KEYWORDS: { slug: string; kw: string; kind: string }[] = DEFAULT_CATEGORIES.flatMap((c) =>
  (c.subs ?? []).flatMap((s) => s.keywords.map((kw) => ({ slug: s.slug, kw: keyOf(kw), kind: c.kind }))),
).sort((a, b) => b.kw.length - a.kw.length);

export function keywordSlug(text: string, kind: "INCOME" | "EXPENSE"): string | null {
  const t = ` ${keyOf(text)} `;
  for (const k of KEYWORDS) {
    if (k.kind !== kind) continue;
    const kw = k.kw.trim();
    if (new RegExp(`(^|[^a-z0-9])${kw.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}([^a-z0-9]|$)`).test(t)) return k.slug;
  }
  return null;
}

export async function classify(userId: string, input: { text: string; merchant?: string | null; cnpj?: string | null; kind: "INCOME" | "EXPENSE"; useAi?: boolean }): Promise<Classification> {
  const text = [input.merchant, input.text].filter(Boolean).join(" ");
  const k = keyOf(text);

  const rules = await db.rule.findMany({ where: { userId }, orderBy: { priority: "desc" }, include: { category: true } });
  const rule = rules.find((r) => r.category.kind === input.kind && k.includes(r.matchText));
  if (rule) return { categoryId: rule.categoryId, confidence: 0.99, source: "regra" };

  const keys = [input.cnpj, input.merchant && keyOf(normalizeMerchant(input.merchant)), keyOf(input.text)].filter(Boolean) as string[];
  if (keys.length) {
    const mem = await db.merchantMemory.findFirst({ where: { userId, key: { in: keys } }, orderBy: { hits: "desc" }, include: { } });
    if (mem) {
      const cat = await db.category.findFirst({ where: { id: mem.categoryId, userId, kind: input.kind } });
      if (cat) return { categoryId: cat.id, confidence: Math.min(0.97, 0.8 + mem.hits * 0.03), source: "historico" };
    }
  }

  const slug = keywordSlug(text, input.kind);
  if (slug) {
    const cat = await db.category.findUnique({ where: { userId_slug: { userId, slug } } });
    if (cat) return { categoryId: cat.id, confidence: 0.85, source: "base" };
  }

  if (input.useAi !== false && aiEnabled() && text.trim()) {
    try {
      const cats = await db.category.findMany({ where: { userId, kind: input.kind, parentId: { not: null } }, include: { parent: true } });
      const list = cats.map((c) => `${c.slug}: ${c.parent?.name} > ${c.name}`).join("\n");
      const r = await aiJson<{ slug: string; confidence: number }>(userId, "classify",
        `Você classifica lançamentos financeiros pessoais no Brasil. Responda só JSON {"slug": string, "confidence": number 0-1} escolhendo um slug desta lista:\n${list}`,
        `Lançamento: "${text}"`);
      const cat = r && cats.find((c) => c.slug === r.slug);
      if (cat) return { categoryId: cat.id, confidence: Math.max(0.3, Math.min(0.9, r!.confidence ?? 0.6)), source: "ia" };
    } catch (e) { console.error("classify ia", e); }
  }

  const fb = await db.category.findUnique({ where: { userId_slug: { userId, slug: input.kind === "INCOME" ? FALLBACK_INCOME : FALLBACK_EXPENSE } } });
  return { categoryId: fb?.id ?? null, confidence: 0.3, source: "padrao" };
}

/** Aprende com a escolha do usuario (RF-042): reforca o historico do estabelecimento. */
export async function learn(userId: string, key: string, categoryId: string) {
  const k = keyOf(key);
  if (!k) return;
  await db.merchantMemory.upsert({ where: { userId_key: { userId, key: k } }, update: { categoryId, hits: { increment: 1 } }, create: { userId, key: k, categoryId } });
}
