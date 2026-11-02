"use client";
import { useEffect, useState } from "react";
import Link from "next/link";

/** Revela secoes ao rolar. So esconde o que esta abaixo da dobra no carregamento, entao nada pisca e sem JS tudo aparece. */
export function Reveal() {
  useEffect(() => {
    if (matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const els = Array.from(document.querySelectorAll<HTMLElement>("[data-r]"));
    const io = new IntersectionObserver((entries) => {
      for (const e of entries) if (e.isIntersecting) { e.target.classList.add("r-in"); e.target.classList.remove("r-wait"); io.unobserve(e.target); }
    }, { rootMargin: "0px 0px -8% 0px", threshold: 0.12 });
    for (const el of els) { if (el.getBoundingClientRect().top > innerHeight * 0.92) { el.classList.add("r-wait"); io.observe(el); } }
    const nav = document.querySelector(".s-nav"); const onScroll = () => nav?.classList.toggle("s-nav-on", scrollY > 12);
    onScroll(); addEventListener("scroll", onScroll, { passive: true });
    return () => { io.disconnect(); removeEventListener("scroll", onScroll); };
  }, []);
  return null;
}

/** Numero que sobe ate o valor (centavos), em reais. */
export function CountUp({ cents, ms = 1400 }: { cents: number; ms?: number }) {
  const [v, setV] = useState(cents);
  useEffect(() => {
    if (matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    let raf = 0; const t0 = performance.now();
    const tick = (t: number) => { const p = Math.min(1, (t - t0) / ms); setV(Math.round(cents * (1 - Math.pow(1 - p, 3)))); if (p < 1) raf = requestAnimationFrame(tick); };
    setV(0); raf = requestAnimationFrame(tick); return () => cancelAnimationFrame(raf);
  }, [cents, ms]);
  return <>{(v / 100).toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}</>;
}

export type SitePlan = { code: string; name: string; description: string; price: number; yearly: number | null; receipts: number; chat: number; members: number; trialDays?: number; features?: string[] };
const brl = (c: number) => (c / 100).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

export function Pricing({ plans, featured = "PRO" }: { plans: SitePlan[]; featured?: string }) {
  const [year, setYear] = useState(false);
  const hasYear = plans.some((p) => p.price && p.yearly);
  return (
    <>
      {hasYear && (
        <div className="s-toggle" role="group" aria-label="Forma de cobrança">
          <button type="button" aria-pressed={!year} onClick={() => setYear(false)}>Mensal</button>
          <button type="button" aria-pressed={year} onClick={() => setYear(true)}>Anual <span className="s-save">economize</span></button>
        </div>
      )}
      <div className="s-plans">
        {plans.map((p) => {
          const v = year && p.yearly ? p.yearly : p.price; const per = year && p.yearly ? "/ano" : "/mês";
          const disc = p.price && p.yearly ? Math.round((1 - p.yearly / (p.price * 12)) * 100) : 0;
          const feats = [
            "Lançamentos, contas e categorias ilimitados", "Registro por voz e nota fiscal",
            p.receipts >= 500 ? "Leitura de comprovantes à vontade*" : `${p.receipts} leituras de comprovante por mês`,
            p.chat >= 200 ? "Consultor financeiro ampliado*" : `${p.chat} perguntas ao consultor por mês`,
            ...(p.price ? ["Relatórios em PDF e imagem", "Avisos de contas e fatura"] : []),
            ...(p.members > 1 ? [`Até ${p.members} pessoas na mesma conta`] : []),
            ...(p.features ?? []),
          ];
          const hot = p.code === featured;
          return (
            <article key={p.code} className={`s-plan ${hot ? "s-plan-hot" : ""}`} data-r>
              {hot && <span className="s-badge">Mais escolhido</span>}
              <h3>{p.name}</h3>
              <p className="s-muted">{p.description}</p>
              <div className="s-price">{v ? <><b>{brl(v)}</b><span>{per}</span></> : <b>Grátis</b>}</div>
              <p className="s-price-note">{v && year && disc > 0 ? `${disc}% mais barato que pagar mês a mês` : v ? "Cancele quando quiser" : "Para sempre, sem cartão"}</p>
              <ul>{feats.map((f) => <li key={f}>{f}</li>)}</ul>
              <Link className={`s-btn ${hot ? "s-btn-sun" : "s-btn-line"}`} href={`/cadastro?plano=${p.code}`}>{p.price ? (p.trialDays ? `Testar ${p.trialDays} dias grátis` : `Quero o ${p.name}`) : "Começar grátis"}</Link>
            </article>
          );
        })}
      </div>
      <p className="s-fine">* Com política de uso justo. Preços em reais, com cobrança recorrente. Mude ou cancele direto no app.</p>
    </>
  );
}

/** Barra de progresso de leitura no topo e linha do tempo que acompanha a rolagem. */
export function ScrollFx() {
  useEffect(() => {
    const bar = document.querySelector<HTMLElement>(".s-progress");
    const tl = document.querySelector<HTMLElement>(".s-day");
    let raf = 0;
    const on = () => { cancelAnimationFrame(raf); raf = requestAnimationFrame(() => {
      const h = document.documentElement; const p = h.scrollTop / Math.max(1, h.scrollHeight - innerHeight);
      bar?.style.setProperty("--p", String(p));
      if (tl) { const r = tl.getBoundingClientRect(); const q = Math.min(1, Math.max(0, (innerHeight * 0.6 - r.top) / r.height)); tl.style.setProperty("--p", String(q));
        tl.querySelectorAll<HTMLElement>(".s-day-i").forEach((el) => el.classList.toggle("on", el.getBoundingClientRect().top < innerHeight * 0.62)); }
    }); };
    on(); addEventListener("scroll", on, { passive: true }); addEventListener("resize", on);
    return () => { removeEventListener("scroll", on); removeEventListener("resize", on); cancelAnimationFrame(raf); };
  }, []);
  return <div className="s-progress" aria-hidden />;
}

/** Frase digitada aos poucos, como se a pessoa estivesse falando com o app. */
export function Typed({ phrases }: { phrases: string[] }) {
  const [t, setT] = useState(phrases[0]);
  useEffect(() => {
    if (matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    let i = 0, j = 0, del = false, timer: ReturnType<typeof setTimeout>;
    const tick = () => {
      const full = phrases[i];
      j += del ? -1 : 1; setT(full.slice(0, j));
      if (!del && j === full.length) { del = true; timer = setTimeout(tick, 1800); return; }
      if (del && j === 0) { del = false; i = (i + 1) % phrases.length; }
      timer = setTimeout(tick, del ? 22 : 48);
    };
    setT(""); timer = setTimeout(tick, 900); return () => clearTimeout(timer);
  }, [phrases]);
  return <span className="s-typed">{t}<i aria-hidden>|</i></span>;
}

/** Simulador: quanto a familia junta guardando um valor por mes. */
export function Simulator() {
  const [m, setM] = useState(300); const [y, setY] = useState(10);
  const rate = 0.006; const n = y * 12;
  const total = Math.round(m * ((Math.pow(1 + rate, n) - 1) / rate)); const put = m * n;
  const fmt = (v: number) => v.toLocaleString("pt-BR", { style: "currency", currency: "BRL", maximumFractionDigits: 0 });
  const bars = Array.from({ length: Math.min(y, 25) }, (_, k) => { const nn = (k + 1) * 12; return Math.round(m * ((Math.pow(1 + rate, nn) - 1) / rate)); });
  const max = bars[bars.length - 1] || 1;
  return (
    <div className="s-sim">
      <div className="s-sim-in">
        <label className="s-range"><span>Guardando por mês <b>{fmt(m)}</b></span><input type="range" min={50} max={3000} step={50} value={m} onChange={(e) => setM(Number(e.target.value))} aria-label="Valor guardado por mês" /></label>
        <label className="s-range"><span>Durante <b>{y} {y === 1 ? "ano" : "anos"}</b></span><input type="range" min={1} max={25} value={y} onChange={(e) => setY(Number(e.target.value))} aria-label="Anos guardando" /></label>
        <div className="s-sim-res"><small>Sua família pode ter</small><b>{fmt(total)}</b><span>Você guardou {fmt(put)}. O rendimento somou {fmt(total - put)}.</span></div>
        <p className="s-fine" style={{ textAlign: "left", marginTop: 6 }}>Simulação com rendimento hipotético de 0,6% ao mês, sem impostos. Não é promessa de retorno.</p>
      </div>
      <div className="s-sim-chart" aria-hidden>{bars.map((v, k) => <span key={k} style={{ height: `${Math.max(4, (v / max) * 100)}%` }} title={fmt(v)} />)}</div>
    </div>
  );
}
