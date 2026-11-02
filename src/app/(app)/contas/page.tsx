import Link from "next/link";
import { requireUser } from "@/lib/auth";
import { accountBalances, cardInvoices } from "@/lib/finance";
import { Money } from "@/components/ui";
import { AccountForm, AdjustButton } from "./client";

const TYPES: Record<string, string> = { CHECKING: "Conta corrente", SAVINGS: "Poupança", WALLET: "Dinheiro", INVESTMENT: "Investimento", MEAL: "Vale-refeição/alimentação", CREDIT_CARD: "Cartão de crédito" };

export default async function Contas() {
  const user = await requireUser();
  const accs = await accountBalances(user.id);
  const cards = await Promise.all(accs.filter((a) => a.type === "CREDIT_CARD").map((c) => cardInvoices(user.id, c.id)));
  const cash = accs.filter((a) => a.type !== "CREDIT_CARD");
  return (
    <div className="mx-auto max-w-3xl">
      <h1 className="mb-4 text-xl font-bold">Contas e cartões</h1>
      <h2 className="mb-2 font-semibold">Contas</h2>
      <ul className="mb-6 grid gap-3 sm:grid-cols-2">
        {cash.map((a) => (
          <li key={a.id} className="card">
            <div className="flex items-start justify-between">
              <div><p className="font-semibold"><span className="mr-2 inline-block h-3 w-3 rounded-full" style={{ background: a.color }} />{a.name}</p><p className="muted text-xs">{TYPES[a.type]}</p></div>
              <Link href={`/lancamentos?conta=${a.id}&mes=todos`} className="muted text-xs">extrato ›</Link>
            </div>
            <Money cents={a.balance} className={`mt-2 block text-2xl font-bold ${a.balance < 0 ? "text-coral" : ""}`} />
            <AdjustButton id={a.id} current={a.balance} />
          </li>
        ))}
      </ul>
      <h2 className="mb-2 font-semibold">Cartões de crédito</h2>
      <ul className="mb-6 grid gap-3 sm:grid-cols-2">
        {cards.map(({ card, invoices, used, available, currentOpen }) => {
          const open = invoices.find((i) => i.month === currentOpen);
          return (
            <li key={card.id}><Link href={`/contas/${card.id}`} className="card block" style={{ borderTop: `4px solid ${card.color}` }}>
              <p className="font-semibold">💳 {card.name}</p>
              <p className="muted text-xs">Fecha dia {card.closingDay} · vence dia {card.dueDay}</p>
              <p className="mt-2 text-sm">Fatura aberta</p><Money cents={open?.total ?? 0} className="text-2xl font-bold" />
              {card.limitCents ? (<>
                <div className="mt-2 h-2 overflow-hidden rounded-full" style={{ background: "var(--line)" }}><div className="h-full rounded-full" style={{ width: `${Math.min(100, (used / card.limitCents) * 100)}%`, background: used / card.limitCents > 0.8 ? "#E5484D" : used / card.limitCents > 0.6 ? "#FFB020" : "#19C37D" }} /></div>
                <p className="muted mt-1 text-xs">Disponível <Money cents={available} /> de <Money cents={card.limitCents} /></p>
              </>) : null}
            </Link></li>
          );
        })}
        {!cards.length && <li className="card muted text-sm">Nenhum cartão cadastrado.</li>}
      </ul>
      <AccountForm />
    </div>
  );
}
