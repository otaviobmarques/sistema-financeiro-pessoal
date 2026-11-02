import { requireUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { PLANS, usage } from "@/lib/plans";
import { brl, dateBR } from "@/lib/money";
import { aiEnabled, aiProvider } from "@/lib/ai";
import { logout } from "@/app/actions";
import { Appearance, PlanBox, CategoryForm, RuleDelete, DeleteAccount, ServerPrefs } from "./client";

export default async function Ajustes() {
  const user = await requireUser();
  const [cats, rules, u] = await Promise.all([
    db.category.findMany({ where: { userId: user.id, parentId: null }, include: { children: { orderBy: { name: "asc" } } }, orderBy: [{ kind: "desc" }, { name: "asc" }] }),
    db.rule.findMany({ where: { userId: user.id }, include: { category: { include: { parent: true } } } }),
    usage(user.id),
  ]);
  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <h1 className="text-xl font-bold">Ajustes</h1>

      <section className="card space-y-3"><h2 className="font-semibold">Aparência e acessibilidade</h2><Appearance /><ServerPrefs simple={user.simpleMode} hide={user.hideValues} reminder={user.dailyReminder} /></section>

      <section id="plano" className="card space-y-3">
        <h2 className="font-semibold">Plano e pagamento</h2>
        <p>Você está no plano <b>{PLANS[user.plan].name}</b>{user.planRenewsAt && <> · renova em {dateBR(user.planRenewsAt)} (avisamos 3 dias antes)</>}.</p>
        <p className="muted text-sm">Este mês: {u.receipts} leituras de comprovante, {u.chat} perguntas ao consultor.</p>
        <PlanBox plan={user.plan} prices={{ PRO: brl(PLANS.PRO.price), FAMILY: brl(PLANS.FAMILY.price) }} />
      </section>

      <section className="card space-y-3">
        <h2 className="font-semibold">Categorias</h2>
        <ul className="space-y-2 text-sm">{cats.map((c) => (
          <li key={c.id}><details><summary className="cursor-pointer font-medium">{c.icon} {c.name} <span className="muted">({c.children.length})</span></summary>
            <p className="muted ml-6 mt-1">{c.children.map((s) => s.name).join(" · ")}</p></details></li>))}</ul>
        <CategoryForm parents={cats.map((c) => ({ id: c.id, name: `${c.icon} ${c.name}` }))} />
      </section>

      <section className="card space-y-2">
        <h2 className="font-semibold">Regras que o Sobbra aprendeu</h2>
        {!rules.length && <p className="muted text-sm">Quando você corrigir uma categoria e escolher “aplicar a todos”, a regra aparece aqui.</p>}
        <ul className="text-sm">{rules.map((r) => <li key={r.id} className="flex items-center justify-between py-1">“{r.matchText}” → {r.category.parent?.name} › {r.category.name}<RuleDelete id={r.id} /></li>)}</ul>
      </section>

      <section className="card space-y-3">
        <h2 className="font-semibold">Privacidade e seus dados (LGPD)</h2>
        <p className="muted text-sm">Seus comprovantes ficam criptografados. Dados enviados à IA não são usados para treinar modelos de terceiros. Leitura por IA: {aiEnabled() ? `ligada (${aiProvider()})` : "desligada"}.</p>
        <div className="flex flex-wrap gap-2"><a className="btn-ghost" href="/api/export">⬇️ Baixar todos os meus dados (JSON)</a><a className="btn-ghost" href="/api/export?formato=csv">⬇️ Lançamentos (CSV)</a></div>
        <DeleteAccount />
      </section>

      <form action={logout}><button className="btn-ghost w-full">Sair da conta</button></form>
    </div>
  );
}
