import Link from "next/link";
import { redirect } from "next/navigation";
import { currentUserId } from "@/lib/auth";
import { Logo } from "@/components/ui";
import { Credits } from "@/components/Credits";
import { getPlans } from "@/lib/plans";
import { brl } from "@/lib/money";

export default async function Landing({ searchParams }: { searchParams: Promise<{ excluida?: string }> }) {
  if (await currentUserId()) redirect("/inicio");
  const sp = await searchParams;
  const PLANS = await getPlans();
  const rows: [string, string, string, string][] = [
    ["Lançamentos, contas e categorias", "Ilimitado", "Ilimitado", "Ilimitado"],
    ["Leitura de comprovante por IA", `${PLANS.FREE.receipts}/mês`, "Ilimitado*", "Ilimitado*"],
    ["Agente de voz", "Sim", "Sim", "Sim"],
    ["Consultor IA (perguntas)", `${PLANS.FREE.chat}/mês`, "Ampliado*", "Ampliado*"],
    ["Open Finance", "—", "Até 3 conexões", "Até 8 conexões"],
    ["Espaço compartilhado", "—", "—", `Até ${PLANS.FAMILY.members} pessoas`],
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
          <p className="eyebrow">Menos ruído. Mais clareza.</p>
          <h1 className="mt-2 text-5xl leading-[1.05] text-floresta dark:text-[#ECEFE6] md:text-6xl">Seu dinheiro.<br />Mais espaço<br /><i>para você.</i></h1>
          <p className="muted mt-4 text-lg">Organize o dia a dia e dê um lugar aos seus planos. No seu ritmo, sem julgamentos.</p>
          <ul className="mt-6 space-y-2">
            <li>Registre por voz, foto do comprovante ou digitando. Você confere antes de salvar.</li>
            <li>Veja quanto está livre no seu plano, com a conta explicada.</li>
            <li>Contas a pagar, metas e orçamento num só lugar.</li>
            <li>Pergunte sobre os seus próprios movimentos.</li>
          </ul>
          <Link href="/cadastro" className="btn-primary mt-8 px-8 text-lg">Começar do zero <span aria-hidden>→</span></Link>
          <p className="muted mt-3 text-sm">Sem anúncios. Cancele em 2 toques.</p>
        </div>
        <div className="hero mx-auto w-full max-w-sm">
          <p className="text-xs font-bold">Exemplo com dados fictícios</p>
          <p className="mt-3 text-sm font-bold">No seu plano, ainda há</p>
          <p className="serif text-4xl">R$ 1.600,00</p>
          <p className="text-sm">Até 30 de novembro · Estimativa após contas pendentes e reserva planejada.</p>
          <div className="mt-4 grid grid-cols-2 gap-3 text-sm">
            <div className="rounded-xl bg-white p-3"><p className="text-xs">Entradas do mês</p><p className="font-bold">+ R$ 6.400,00</p></div>
            <div className="rounded-xl bg-white p-3"><p className="text-xs">Saídas do mês</p><p className="font-bold">− R$ 3.150,00</p></div>
          </div>

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
        <p className="muted mt-2 text-xs">* Com política de uso justo.{PLANS.PRO.yearly ? ` Pro anual: ${brl(PLANS.PRO.yearly)}.` : ""} Cancele quando quiser, em 2 toques.</p>
      </section>
      <footer className="line mt-6 border-t pt-6"><Credits /><p className="muted mt-3 text-center text-xs">© {new Date().getFullYear()} Sobbra. Seu dinheiro. Mais espaço para você.</p></footer>
    </main>
  );
}
