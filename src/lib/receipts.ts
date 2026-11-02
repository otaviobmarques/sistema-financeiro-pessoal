// Pipeline de comprovantes (secao 5.4): captura -> pre-processamento (hash) -> extracao IA
// -> classificacao -> conciliacao (duplicidade) -> confirmacao pelo usuario.
import { db } from "./db";
import { readEncrypted } from "./crypto";
import { aiEnabled, aiJson } from "./ai";
import { classify } from "./classify";
import { normalizeMerchant } from "./normalize";

export type Extracted = {
  docType?: string; type?: "EXPENSE" | "INCOME"; amount?: number; date?: string; merchant?: string; cnpj?: string;
  paymentMethod?: string; cardLast4?: string; items?: { description: string; quantity?: number; total?: number }[];
  confidence?: Record<string, number>; categoryId?: string | null; categoryConfidence?: number; duplicateOf?: string | null;
};

const PROMPT = `Você lê comprovantes brasileiros (cupom fiscal, NFC-e impressa, comprovante de Pix, TED, boleto pago, maquininha, recibo manuscrito, print de app de delivery).
Responda SOMENTE JSON com as chaves:
{"docType": "cupom|nfce|pix|ted|boleto|maquininha|manuscrito|delivery|outro",
 "type": "EXPENSE|INCOME" (INCOME apenas se for Pix/TED RECEBIDO pela pessoa),
 "amount": number (valor total em reais, ex 123.45),
 "date": "YYYY-MM-DD" ou null, "time": "HH:MM" ou null,
 "merchant": nome do estabelecimento ou de quem recebeu/enviou,
 "cnpj": só dígitos ou null,
 "paymentMethod": "credito|debito|pix|dinheiro|boleto|outro" ou null,
 "cardLast4": string ou null,
 "items": [{"description": string, "quantity": number, "total": number}] (vazio se não houver),
 "confidence": {"amount": 0-1, "date": 0-1, "merchant": 0-1}}
Se não conseguir ler um campo, use null e confiança baixa. Não invente.`;

export async function processReceipt(receiptId: string) {
  const r = await db.receipt.findUnique({ where: { id: receiptId } });
  if (!r || r.status !== "QUEUED") return;
  await db.receipt.update({ where: { id: r.id }, data: { status: "PROCESSING" } });
  try {
    if (!aiEnabled()) {
      await db.receipt.update({ where: { id: r.id }, data: { status: "READY", extracted: {}, error: "Leitura automática desligada (sem chave de IA). Preencha os campos." } });
      return;
    }
    const buf = await readEncrypted(r.filePath);
    const dataUrl = `data:${r.mimeType};base64,${buf.toString("base64")}`;
    const out = await aiJson<any>(r.userId, "vision", PROMPT, [
      { type: "text", text: "Extraia os dados deste comprovante." },
      { type: "image_url", image_url: { url: dataUrl } },
    ], true);
    const ex: Extracted = {
      docType: out?.docType ?? "outro", type: out?.type === "INCOME" ? "INCOME" : "EXPENSE",
      amount: typeof out?.amount === "number" ? out.amount : Number(String(out?.amount ?? "").replace(",", ".")) || undefined,
      date: out?.date ?? undefined, merchant: out?.merchant ? normalizeMerchant(out.merchant) : undefined,
      cnpj: out?.cnpj ? String(out.cnpj).replace(/\D/g, "") : undefined, paymentMethod: out?.paymentMethod ?? undefined,
      cardLast4: out?.cardLast4 ?? undefined, items: Array.isArray(out?.items) ? out.items.slice(0, 80) : [], confidence: out?.confidence ?? {},
    };
    const cls = await classify(r.userId, { text: [ex.merchant, ...(ex.items ?? []).slice(0, 3).map((i) => i.description)].filter(Boolean).join(" "), merchant: ex.merchant, cnpj: ex.cnpj, kind: ex.type! });
    ex.categoryId = cls.categoryId; ex.categoryConfidence = cls.confidence;
    // Comprovante ja lancado? valor + data + estabelecimento (RF-035)
    if (ex.amount && ex.date) {
      const d = new Date(ex.date + "T12:00:00");
      const dup = await db.transaction.findFirst({ where: { userId: r.userId, deletedAt: null, amountCents: Math.round(ex.amount * 100),
        date: { gte: new Date(+d - 86400000 * 1.5), lte: new Date(+d + 86400000 * 1.5) } } });
      if (dup && (!ex.merchant || !dup.merchant || dup.merchant.toLowerCase() === ex.merchant.toLowerCase())) ex.duplicateOf = dup.id;
    }
    await db.receipt.update({ where: { id: r.id }, data: { status: "READY", docType: ex.docType, extracted: ex as any, confidence: ex.confidence as any, error: null } });
  } catch (e: any) {
    console.error("receipt", e);
    await db.receipt.update({ where: { id: r.id }, data: { status: "READY", extracted: {}, error: "Não consegui ler este comprovante. Confira e preencha os campos." } });
  }
}
