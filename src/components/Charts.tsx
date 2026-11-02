"use client";
// Graficos interativos com animacao de entrada (RF-052, RF-057, RF-150).
import { useRouter } from "next/navigation";
import { Area, AreaChart, Bar, BarChart, Cell, Pie, PieChart, ResponsiveContainer, Tooltip, XAxis, YAxis, ReferenceLine } from "recharts";

const brl = (c: number) => (c / 100).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
const short = (c: number) => { const v = c / 100; return Math.abs(v) >= 1000 ? `${(v / 1000).toFixed(1).replace(".", ",")} mil` : v.toFixed(0); };
const MONTHS = ["jan", "fev", "mar", "abr", "mai", "jun", "jul", "ago", "set", "out", "nov", "dez"];
const tip = { contentStyle: { background: "var(--card)", border: "1px solid var(--line)", borderRadius: 12, color: "var(--text)" } };

export function CategoryDonut({ data, month }: { data: { id: string; name: string; total: number; color: string; icon: string }[]; month: string }) {
  const router = useRouter();
  if (!data.length) return <Empty />;
  return (
    <ResponsiveContainer width="100%" height={240}>
      <PieChart>
        <Pie data={data} dataKey="total" nameKey="name" innerRadius="58%" outerRadius="90%" paddingAngle={2} animationDuration={800}
          onClick={(d: any) => router.push(`/lancamentos?mes=${month}&cat=${d.id}`)} className="cursor-pointer">
          {data.map((d) => <Cell key={d.id} fill={d.color} stroke="var(--card)" />)}
        </Pie>
        <Tooltip {...tip} formatter={(v: number, n: string) => [brl(v), n]} />
      </PieChart>
    </ResponsiveContainer>
  );
}

export function MonthBars({ data }: { data: { month: string; income: number; expense: number }[] }) {
  const router = useRouter();
  const rows = data.map((d) => ({ ...d, label: MONTHS[Number(d.month.split("-")[1]) - 1] }));
  return (
    <ResponsiveContainer width="100%" height={220}>
      <BarChart data={rows} onClick={(e: any) => e?.activePayload && router.push(`/inicio?mes=${e.activePayload[0].payload.month}`)}>
        <XAxis dataKey="label" tickLine={false} axisLine={false} stroke="var(--muted)" fontSize={12} />
        <YAxis tickFormatter={short} tickLine={false} axisLine={false} stroke="var(--muted)" fontSize={11} width={48} />
        <Tooltip {...tip} cursor={{ fill: "rgba(25,195,125,.08)" }} formatter={(v: number, n: string) => [brl(v), n === "income" ? "Entrou" : "Saiu"]} />
        <Bar dataKey="income" fill="#123E32" radius={[6, 6, 0, 0]} animationDuration={700} className="cursor-pointer" />
        <Bar dataKey="expense" fill="#A54632" radius={[6, 6, 0, 0]} animationDuration={700} className="cursor-pointer" />
      </BarChart>
    </ResponsiveContainer>
  );
}

export function BalanceLine({ data }: { data: { day: number; balance: number; future: boolean }[] }) {
  return (
    <ResponsiveContainer width="100%" height={200}>
      <AreaChart data={data.map((d) => ({ ...d, past: d.future ? null : d.balance }))}>
        <defs><linearGradient id="bl" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor="#123E32" stopOpacity={0.35} /><stop offset="1" stopColor="#123E32" stopOpacity={0} /></linearGradient></defs>
        <XAxis dataKey="day" tickLine={false} axisLine={false} stroke="var(--muted)" fontSize={11} />
        <YAxis tickFormatter={short} tickLine={false} axisLine={false} stroke="var(--muted)" fontSize={11} width={48} />
        <ReferenceLine y={0} stroke="#A54632" strokeDasharray="4 4" />
        <Tooltip {...tip} formatter={(v: number) => [brl(v), "Saldo"]} labelFormatter={(d) => `Dia ${d}`} />
        <Area type="monotone" dataKey="balance" stroke="#123E32" strokeDasharray="4 4" strokeOpacity={0.5} fill="none" animationDuration={900} />
        <Area type="monotone" dataKey="past" stroke="#123E32" strokeWidth={2.5} fill="url(#bl)" animationDuration={900} />
      </AreaChart>
    </ResponsiveContainer>
  );
}

export function WeekHeat({ data }: { data: number[] }) {
  const days = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"];
  const max = Math.max(...data, 1);
  return (
    <div className="grid grid-cols-7 gap-2">
      {data.map((v, i) => (
        <div key={i} className="text-center">
          <div title={brl(v)} className="mx-auto aspect-square w-full rounded-xl transition-all duration-700" style={{ background: `rgba(229,72,77,${0.08 + (v / max) * 0.85})` }} />
          <div className="muted mt-1 text-xs">{days[i]}</div>
          <div className="money text-[10px] tabular-nums">{short(v)}</div>
        </div>
      ))}
    </div>
  );
}

export function MiniBars({ data }: { data: { name: string; value: number; color: string }[] }) {
  const max = Math.max(...data.map((d) => d.value), 1);
  return (
    <div className="space-y-2">
      {data.map((d) => (
        <div key={d.name}>
          <div className="flex justify-between text-xs"><span>{d.name}</span><span className="money tabular-nums">{brl(d.value)}</span></div>
          <div className="h-2 overflow-hidden rounded-full" style={{ background: "var(--line)" }}>
            <div className="h-full origin-left rounded-full" style={{ width: `${(d.value / max) * 100}%`, background: d.color, animation: "fillin 600ms ease-out" }} />
          </div>
        </div>
      ))}
    </div>
  );
}

const Empty = () => <div className="muted grid h-40 place-items-center text-sm">Sem gastos neste período ainda.</div>;
