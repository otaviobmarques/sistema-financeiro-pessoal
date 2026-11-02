// URL para cadastrar no gateway: https://SEU_DOMINIO/api/billing/webhook/asaas (ou /stripe)
import { NextResponse } from "next/server";
import { asaas } from "@/lib/billing/asaas";
import { stripe } from "@/lib/billing/stripe";
import { applyBillingUpdate } from "@/lib/billing/apply";

export async function POST(req: Request, { params }: { params: Promise<{ provider: string }> }) {
  const { provider } = await params;
  const p = provider === "asaas" ? asaas : provider === "stripe" ? stripe : null;
  if (!p || !p.configured()) return NextResponse.json({ error: "gateway não configurado" }, { status: 404 });
  const body = await req.text();
  const u = await p.parseWebhook(req, body).catch(() => null);
  if (!u) return NextResponse.json({ error: "assinatura do webhook inválida" }, { status: 401 });
  const result = await applyBillingUpdate(p.id, u);
  return NextResponse.json({ received: true, result });
}
