import Link from "next/link";
import { requireUser, isAdmin } from "@/lib/auth";
import { Credits } from "@/components/Credits";

/** Mais: onde ajusto ou aprofundo (Design System, p. 8). */
export default async function Mais() {
  const user = await requireUser();
  const groups: [string, [string, string, string][]][] = [
    ["Acompanhar", [["/contas", "Contas e cartões", "Saldos e faturas"], ["/relatorios/despesas", "Relatórios", "Despesas por período, PDF e imagem"], ["/relatorios", "Onde gasto mais", "Categorias e comparativos"], ["/avisos", "Avisos", "Contas, faturas e orçamento"]]],
    ["Ajuda", [["/consultor", "Pergunte ao Sobbra", "Perguntas sobre os seus movimentos"]]],
    ["Preferências", [["/ajustes", "Preferências", "Aparência, avisos, plano e privacidade"], ["/lixeira", "Lixeira", "Recupere o que excluiu"], ...(isAdmin(user) ? [["/admin", "Backoffice", "Usuários, planos e auditoria"] as [string, string, string]] : [])]],
  ];
  return (
    <div className="mx-auto max-w-md space-y-5">
      <h1 className="text-[34px] leading-[1.1]">Mais</h1>
      {groups.map(([g, items]) => (
        <section key={g} aria-label={g}>
          <p className="eyebrow mb-2">{g}</p>
          <ul className="card p-0">{items.map(([href, title, sub]) => (
            <li key={href} className="line border-t first:border-0"><Link href={href} className="flex min-h-[64px] items-center gap-3 px-4"><span className="flex-1"><b className="block">{title}</b><span className="muted text-sm">{sub}</span></span><span className="muted" aria-hidden>›</span></Link></li>
          ))}</ul>
        </section>
      ))}
      <section className="card" aria-label="Créditos"><p className="eyebrow mb-3">Créditos</p><Credits /></section>
    </div>
  );
}
