import Link from "next/link";
import { redirect } from "next/navigation";
import { currentUserId } from "@/lib/auth";
import { Logo } from "@/components/ui";
import { PLANS } from "@/lib/plans";
import { brl } from "@/lib/money";

export default async function Landing({ searchParams }: { searchParams: Promise<{ excluida?: string }> }) {
  if (await currentUserId()) redirect("/inicio");
  const sp = await searchParams;
  const rows: [string, string, string, string][] = [
    ["Lançamentos, contas e categorias", "Ilimitado", "Ilimitado", "Ilimitado"],
    ["Leitura de comprovante por IA", "15/mês", "Ilimitado*", "Ilimitado*"],
    ["Agente de voz", "Sim", "Sim", "Sim"],
    ["Consultor IA (perguntas)", "10/mês", "Ampliado*", "Ampliado*"],
    ["Open Finance", "—", "Até 3 conexões", "Até 8 conexões"],
    ["Espaço compartilhado", "—", "—", "Até 5 pessoas"],
  ];
  return (
    <main className="mx-auto max-w-5xl px-4 pb-16">
      {sp.excluida && <p className="soft mt-4 rounded-xl p-3 text-sm">Sua conta e todos os seus dados foram excluídos.</p>}
      <header className="flex items-center justify-between py-5">
        <Logo />
        <div className="flex gap-2"><Link href="/entrar" className="btn-ghost">Entrar</Link><Link href="/cadastro" className="btn-primary">Criar conta grátis</Link></div>
      </header>
      <section className="grid items-center gap-10 py-10 md:grid-cols-2">
        <div>
          <h1 className="font-marca text-4xl font-bold leading-tight text-floresta dark:text-sobbra md:text-5xl">Faça o seu dinheiro sobrar.</h1>
          <p className="muted mt-4 text-lg">Você só tira a foto. O Sobbra anota, organiza e te avisa antes de o dinheiro acabar.</p>
          <ul className="mt-6 space-y-2">
            <li>🎙️ Fale “lançar gasolina 50” e pronto: lançado e categorizado.</li>
            <li>📷 Foto do comprovante vira lançamento em segundos.</li>
            <li>📊 Veja onde gasta mais e quanto vai sobrar no fim do mês.</li>
            <li>💬 Pergunte: “o que estou fazendo de errado?”</li>
          </ul>
          <Link href="/cadastro" className="btn-primary mt-8 px-8 text-lg">Começar agora — é grátis</Link>
          <p className="muted mt-3 text-sm">Sem anúncios. Cancele em 2 toques.</p>
        </div>
        <div className="card mx-auto w-full max-w-sm">
          <p className="muted text-sm">Quanto ainda posso gastar hoje</p>
          <p className="text-4xl font-bold text-sobbra">R$ 87,40</p>
          <div className="mt-4 grid grid-cols-2 gap-3 text-sm">
            <div className="soft rounded-xl p-3"><p className="muted">Entrou</p><p className="font-bold">R$ 4.200,00</p></div>
            <div className="soft rounded-xl p-3"><p className="muted">Saiu</p><p className="font-bold text-coral">R$ 2.913,60</p></div>
          </div>
          <p className="mt-4 rounded-xl bg-ambar/15 p-3 text-sm">🪙 Sobraram R$ 320 este mês. Boa!</p>
        </div>
      </section>
      <section className="py-10">
        <h2 className="mb-6 text-center text-2xl font-bold">Planos</h2>
        <div className="card overflow-x-auto p-0">
          <table className="w-full min-w-[560px] text-sm">
            <thead><tr className="line border-b text-left">
              <th className="p-3">Recurso</th>
              {(["FREE", "PRO", "FAMILY"] as const).map((p) => <th key={p} className="p-3">{PLANS[p].name}<div className="font-normal muted">{PLANS[p].price ? `${brl(PLANS[p].price)}/mês` : "R$ 0"}</div></th>)}
            </tr></thead>
            <tbody>{rows.map((r) => <tr key={r[0]} className="line border-b last:border-0">{r.map((c, i) => <td key={i} className={`p-3 ${i === 0 ? "font-medium" : ""}`}>{c}</td>)}</tr>)}</tbody>
          </table>
        </div>
        <p className="muted mt-2 text-xs">* Com política de uso justo. Pro anual: {brl(PLANS.PRO.yearly)}.</p>
      </section>
    </main>
  );
}
