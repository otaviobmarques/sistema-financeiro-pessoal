// Graficos do painel vibrante em SVG puro: renderizam no servidor, sem biblioteca e sem atraso.
import Link from "next/link";

const brl = (c: number) => (c / 100).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
const short = (c: number) => { const v = Math.abs(c) / 100; return v >= 1000 ? `${(v / 1000).toLocaleString("pt-BR", { maximumFractionDigits: 1 })} mil` : v.toLocaleString("pt-BR", { maximumFractionDigits: 0 }); };
export const PAL = ["#12B76A", "#7C5CFF", "#2E9BFF", "#FFB31F", "#FF5FA2", "#F2545B", "#0B7A53", "#00B8D9", "#9B8CFF", "#FF8A3D"];

export function Gauge({ score, color }: { score: number; color: string }) {
  const R = 80, cx = 100, cy = 100, a1 = Math.PI * (1 - score / 100);
  const pt = (a: number) => `${(cx + R * Math.cos(a)).toFixed(2)} ${(cy - R * Math.sin(a)).toFixed(2)}`;
  return (
    <svg viewBox="-16 0 232 122" className="mx-auto block w-full max-w-[280px]" role="img" aria-label={`Índice de saúde financeira: ${score} de 100`}>
      <defs><linearGradient id="gg" x1="0" x2="1"><stop offset="0" stopColor="#F2545B" /><stop offset=".45" stopColor="#FFB31F" /><stop offset="1" stopColor="#12B76A" /></linearGradient></defs>
      <path d={`M ${pt(Math.PI)} A ${R} ${R} 0 0 1 ${pt(0)}`} fill="none" stroke="var(--line)" strokeWidth="16" strokeLinecap="round" />
      {score > 0 && <path className="g-draw" pathLength={1} d={`M ${pt(Math.PI)} A ${R} ${R} 0 0 1 ${pt(a1)}`} fill="none" stroke="url(#gg)" strokeWidth="16" strokeLinecap="round" />}
      <circle cx={cx + R * Math.cos(a1)} cy={cy - R * Math.sin(a1)} r="9" fill="#fff" stroke={color} strokeWidth="4" />
      {[0, 25, 50, 75, 100].map((v) => { const a = Math.PI * (1 - v / 100); return <text key={v} x={cx + 96 * Math.cos(a)} y={cy - 96 * Math.sin(a) + 4} textAnchor="middle" fontSize="10" fill="var(--muted)">{v}</text>; })}
      <text x="100" y="92" textAnchor="middle" fontSize="34" fontWeight="800" fill="var(--text)">{score}</text>
      <text x="100" y="110" textAnchor="middle" fontSize="11" fill="var(--muted)">de 100</text>
    </svg>
  );
}

export function Spark({ values, color }: { values: number[]; color: string }) {
  if (values.length < 2) return null;
  const w = 140, h = 44, max = Math.max(...values), min = Math.min(...values), span = max - min || 1;
  const pts = values.map((v, i) => [(i / (values.length - 1)) * (w - 8) + 4, h - 6 - ((v - min) / span) * (h - 14)]);
  const d = pts.map((p, i) => `${i ? "L" : "M"}${p[0].toFixed(1)} ${p[1].toFixed(1)}`).join(" ");
  const id = `sp${color.slice(1)}`;
  return (
    <svg viewBox={`0 0 ${w} ${h}`} className="w-full" aria-hidden>
      <defs><linearGradient id={id} x1="0" x2="0" y1="0" y2="1"><stop offset="0" stopColor={color} stopOpacity=".28" /><stop offset="1" stopColor={color} stopOpacity="0" /></linearGradient></defs>
      <path d={`${d} L${pts[pts.length - 1][0]} ${h} L${pts[0][0]} ${h}Z`} fill={`url(#${id})`} />
      <path d={d} fill="none" stroke={color} strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
      <circle cx={pts[pts.length - 1][0]} cy={pts[pts.length - 1][1]} r="3.5" fill={color} />
    </svg>
  );
}

export function Kpi({ i, label, cents, color, icon, series, delta, goodUp, sign = false }: { i: number; label: string; cents: number; color: string; icon: string; series: number[]; delta: number | null; goodUp: boolean; sign?: boolean }) {
  const good = delta !== null && (delta >= 0) === goodUp;
  return (
    <div className="card kpi2 rise min-h-[132px]" style={{ ["--i" as string]: i }}>
      <div className="flex items-center justify-between">
        <span className="ib" style={{ background: `linear-gradient(135deg, ${color}, ${color}CC)`, boxShadow: `0 8px 18px -8px ${color}` }} aria-hidden>{icon}</span>
        {delta !== null && <span className={`delta ${good ? "up" : "down"}`}>{delta >= 0 ? "▲" : "▼"} {Math.abs(delta)}%</span>}
      </div>
      <p className="muted mt-3 text-sm font-semibold">{label}</p>
      <p className="kv money">{sign && cents > 0 ? "+ " : cents < 0 ? "− " : ""}{brl(Math.abs(cents))}</p>
      <div className="sp"><Spark values={series} color={color} /></div>
    </div>
  );
}

export function FlowBars({ data }: { data: { label: string; income: number; expense: number; hl: boolean }[] }) {
  const w = 720, h = 240, pl = 44, pb = 26, pt = 10, max = Math.max(1, ...data.flatMap((d) => [d.income, d.expense]));
  const gw = (w - pl - 8) / data.length, bw = Math.min(26, gw / 3);
  const y = (v: number) => pt + (h - pt - pb) * (1 - v / max);
  const line = data.map((d, i) => `${i ? "L" : "M"}${(pl + gw * i + gw / 2).toFixed(1)} ${y(Math.max(0, d.income - d.expense)).toFixed(1)}`).join(" ");
  return (
    <svg viewBox={`0 0 ${w} ${h}`} className="w-full" role="img" aria-label="Entradas e saídas mês a mês">
      {[0, 0.5, 1].map((f) => <g key={f}><line x1={pl} x2={w - 4} y1={y(max * f)} y2={y(max * f)} stroke="var(--line)" /><text x={pl - 6} y={y(max * f) + 4} textAnchor="end" fontSize="11" fill="var(--muted)">{short(max * f)}</text></g>)}
      {data.map((d, i) => { const x = pl + gw * i + gw / 2; return (
        <g key={d.label}>
          <rect x={x - bw - 2} y={y(d.income)} width={bw} height={Math.max(0, h - pb - y(d.income))} rx="5" fill="#12B76A" className="growy" />
          <rect x={x + 2} y={y(d.expense)} width={bw} height={Math.max(0, h - pb - y(d.expense))} rx="5" fill="#F2545B" className="growy" />
          <text x={x} y={h - 8} textAnchor="middle" fontSize="12" fontWeight={d.hl ? 800 : 500} fill={d.hl ? "var(--text)" : "var(--muted)"}>{d.label}</text>
        </g>); })}
      <path d={line} fill="none" stroke="#7C5CFF" strokeWidth="2.5" strokeLinejoin="round" />
      {data.map((d, i) => <circle key={i} cx={pl + gw * i + gw / 2} cy={y(Math.max(0, d.income - d.expense))} r="3.5" fill="#7C5CFF" />)}
    </svg>
  );
}

export function Treemap({ items, month }: { items: { name: string; total: number }[]; month: string }) {
  const tot = items.reduce((s, x) => s + x.total, 0) || 1;
  const cell = (x: { name: string; total: number }, i: number) => (
    <Link key={x.name} href={`/lancamentos?mes=${month}&q=${encodeURIComponent(x.name)}`} title={`${x.name}: ${brl(x.total)}`} style={{ flex: x.total, background: PAL[i % PAL.length] }}>
      <b className="truncate">{x.name}</b><span className="money">{brl(x.total)} · {Math.round((x.total / tot) * 100)}%</span>
    </Link>
  );
  const rows = [items.slice(0, 2), items.slice(2, 5), items.slice(5, 9)].filter((r) => r.length);
  let k = 0;
  return <div className="tree">{rows.map((r, ri) => <div key={ri}>{r.map((x) => cell(x, k++))}</div>)}</div>;
}

export function HeatCalendar({ days }: { days: { date: string; v: number }[] }) {
  const vals = days.map((d) => d.v).filter(Boolean).sort((a, b) => a - b); const p90 = vals[Math.floor(vals.length * 0.9)] || 1;
  return (
    <>
      <div className="heat" role="img" aria-label="Gastos por dia nas últimas semanas">{days.map((d) => (
        <i key={d.date} title={`${d.date.split("-").reverse().join("/")}: ${brl(d.v)}`} style={{ background: d.v ? `color-mix(in srgb, #12B76A ${20 + Math.round(Math.min(1, d.v / p90) * 80)}%, var(--line))` : "var(--line)" }} />
      ))}</div>
      <div className="muted mt-3 flex items-center gap-1.5 text-xs">menos {[0, 35, 65, 100].map((p) => <i key={p} className="inline-block h-3 w-3 rounded-[3px]" style={{ background: p ? `color-mix(in srgb, #12B76A ${p}%, var(--line))` : "var(--line)" }} />)} mais</div>
    </>
  );
}
