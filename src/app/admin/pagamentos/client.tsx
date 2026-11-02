"use client";
import { startTransition as st, useActionState, useState, useTransition } from "react";
import { savePaymentConfig, testPaymentConfig, clearPaymentKeys, type PayState } from "../actions";

type Field = { key: string; label: string; placeholder: string; required: boolean };
const PROVIDERS = [
  { id: "asaas", name: "Asaas", tag: "Recomendado no Brasil: Pix, boleto e cartão", help: "No Asaas: Integrações → Chave de API. Em Webhooks, cadastre o endereço abaixo e use o mesmo token.", ready: true },
  { id: "stripe", name: "Stripe", tag: "Cartão de crédito internacional", help: "Na Stripe: Developers → API keys e Webhooks (eventos checkout.session.completed, invoice.paid, invoice.payment_failed, customer.subscription.deleted).", ready: true },
  { id: "mercadopago", name: "Mercado Pago", tag: "Em breve", help: "", ready: false },
  { id: "pagarme", name: "Pagar.me", tag: "Em breve", help: "", ready: false },
];
const METHODS: [string, string][] = [["pix", "Pix"], ["boleto", "Boleto"], ["card", "Cartão de crédito"]];

export function PaymentForm({ initial, saved, fields, webhookBase, lastTest }: { initial: { provider: string; env: string; methods: string[]; cycles: string; grace: number }; saved: Record<string, string>; fields: Record<string, Field[]>; webhookBase: string; lastTest: { at: string; ok: boolean; msg: string } | null }) {
  const [prov, setProv] = useState(initial.provider); const [env, setEnv] = useState(initial.env); const [show, setShow] = useState(false);
  const [state, action, pending] = useActionState<PayState, FormData>(savePaymentConfig, undefined);
  const [test, setTest] = useState<PayState>(); const [busy, start] = useTransition(); const [copied, setCopied] = useState(false);
  const p = PROVIDERS.find((x) => x.id === prov); const hook = `${webhookBase}/${prov}`;
  const hasKeys = (fields[prov] ?? []).some((f) => saved[f.key]);
  return (
    <form onSubmit={(e) => { e.preventDefault(); const fd = new FormData(e.currentTarget); st(() => action(fd)); }} className="space-y-4">
      <input type="hidden" name="provider" value={prov} /><input type="hidden" name="env" value={env} />
      <section className="card space-y-3">
        <h2 className="font-semibold">1. Provedor</h2>
        <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-4">{PROVIDERS.map((x) => (
          <button key={x.id} type="button" disabled={!x.ready} aria-pressed={prov === x.id} onClick={() => setProv(x.id)}
            className={`rounded-xl border p-3 text-left transition ${prov === x.id ? "border-sobbra ring-2 ring-sobbra/30" : "line"} ${x.ready ? "hover:border-sobbra" : "cursor-not-allowed opacity-50"}`}>
            <b className="block">{x.name}</b><span className="muted text-xs">{x.tag}</span></button>))}</div>
      </section>
      {p && <>
        <section className="card space-y-3">
          <div className="flex flex-wrap items-center justify-between gap-2"><h2 className="font-semibold">2. Chaves do {p.name}</h2>
            <div className="skinsw" role="group" aria-label="Ambiente">{[["sandbox", "Teste"], ["production", "Produção"]].map(([v, l]) => <button key={v} type="button" aria-pressed={env === v} onClick={() => setEnv(v)}>{l}</button>)}</div></div>
          <p className="muted text-sm">{p.help} {env === "sandbox" ? "Use as chaves de teste: nenhuma cobrança é real." : <b className="text-coral">Produção: cobranças reais nos clientes.</b>}</p>
          <div className="grid gap-3 md:grid-cols-2">{(fields[prov] ?? []).map((f) => (
            <div key={f.key}><label className="label" htmlFor={f.key}>{f.label}</label>
              <input id={f.key} name={f.key} type={show ? "text" : "password"} autoComplete="off" className="input font-mono text-sm" placeholder={saved[f.key] ? `salva: ${saved[f.key]} (deixe vazio para manter)` : f.placeholder} /></div>))}</div>
          <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={show} onChange={(e) => setShow(e.target.checked)} className="h-4 w-4" /> Mostrar o que estou digitando</label>
          <div><span className="label">Endereço do webhook (cadastre no {p.name})</span>
            <div className="flex gap-2"><input readOnly value={hook} className="input flex-1 font-mono text-xs" onFocus={(e) => e.target.select()} />
              <button type="button" className="btn-ghost" onClick={() => navigator.clipboard?.writeText(hook).then(() => { setCopied(true); setTimeout(() => setCopied(false), 1500); })}>{copied ? "Copiado ✓" : "Copiar"}</button></div></div>
        </section>
        <section className="card space-y-3">
          <h2 className="font-semibold">3. Como cobrar</h2>
          <div><span className="label">Formas de pagamento aceitas</span><div className="flex flex-wrap gap-4">{METHODS.map(([v, l]) => <label key={v} className="flex min-h-[40px] items-center gap-2"><input type="checkbox" name={`m_${v}`} defaultChecked={initial.methods.includes(v)} className="h-4 w-4" /> {l}</label>)}</div>
            <p className="muted text-xs">{prov === "stripe" ? "Na Stripe, a assinatura é cobrada no cartão." : "Com mais de uma forma marcada, o cliente escolhe na hora de pagar."}</p></div>
          <div className="grid gap-3 sm:grid-cols-2">
            <div><label className="label" htmlFor="cycles">Ciclos oferecidos</label><select id="cycles" name="cycles" defaultValue={initial.cycles} className="input"><option value="both">Mensal e anual</option><option value="monthly">Só mensal</option><option value="yearly">Só anual</option></select></div>
            <div><label className="label" htmlFor="grace">Dias de tolerância após atraso</label><input id="grace" name="grace" type="number" min={0} max={30} defaultValue={initial.grace} className="input" /><p className="muted mt-1 text-xs">Depois disso, a conta volta para o Grátis. Os dados ficam guardados.</p></div>
          </div>
          <p className="muted text-xs">Preços e dias de teste grátis ficam em Planos e preços.</p>
        </section>
        {state?.error && <p role="alert" className="rounded-xl bg-coral/10 p-3 text-sm text-coral">{state.error}</p>}
        {state?.ok && <p role="status" className="soft rounded-xl p-3 text-sm">{state.ok}</p>}
        {test?.error && <p role="alert" className="rounded-xl bg-coral/10 p-3 text-sm text-coral">{test.error}</p>}
        {test?.ok && <p role="status" className="rounded-xl bg-sobbra/10 p-3 text-sm text-sobbra">{test.ok}</p>}
        {!test && lastTest && <p className="muted text-xs">Último teste em {new Date(lastTest.at).toLocaleString("pt-BR")}: {lastTest.msg}</p>}
        <div className="flex flex-wrap gap-2">
          <button className="btn-primary" disabled={pending}>{pending ? "Salvando…" : "Salvar configuração"}</button>
          <button type="button" className="btn-ghost" disabled={busy || !hasKeys} onClick={() => start(async () => setTest(await testPaymentConfig()))}>{busy ? "Testando…" : "Testar conexão"}</button>
          {hasKeys && <button type="button" className="btn-ghost text-coral" onClick={() => { if (confirm("Apagar as chaves salvas? As assinaturas param de ser criadas até você cadastrar de novo.")) start(async () => setTest(await clearPaymentKeys())); }}>Apagar chaves</button>}
        </div>
      </>}
      {!p && <p className="muted text-sm">Escolha um provedor para continuar. Enquanto nenhum estiver conectado, os clientes ficam no Grátis e veem “assinatura em breve”.</p>}
    </form>
  );
}
