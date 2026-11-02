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

export type SitePlan = { code: string; name: string; description: string; price: number; yearly: number | null; receipts: number; chat: number; members: number };
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
              <Link className={`s-btn ${hot ? "s-btn-sun" : "s-btn-line"}`} href={`/cadastro?plano=${p.code}`}>{p.price ? `Quero o ${p.name}` : "Começar grátis"}</Link>
            </article>
          );
        })}
      </div>
      <p className="s-fine">* Com política de uso justo. Preços em reais, com cobrança recorrente. Mude ou cancele direto no app.</p>
    </>
  );
}
