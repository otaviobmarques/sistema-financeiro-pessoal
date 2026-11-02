"use client";
// Onboarding em ate 3 minutos (RF-003), progressivo (RF-162): so o essencial.
import { useActionState, useState } from "react";
import { finishOnboarding } from "../actions";
import { Logo } from "@/components/ui";

const goals = [
  { v: "sair_do_vermelho", t: "Sair do vermelho", d: "Organizar dívidas e parar de fechar o mês negativo", i: "🧯" },
  { v: "guardar", t: "Guardar dinheiro", d: "Fazer sobrar todo mês e montar uma reserva", i: "🐷" },
  { v: "investir", t: "Começar a investir", d: "Entender quanto dá para separar", i: "🌱" },
];

export function OnboardingForm({ name }: { name: string }) {
  const [state, action, pending] = useActionState(finishOnboarding, undefined);
  const [step, setStep] = useState(0);
  const [hasCard, setHasCard] = useState(false);
  return (
    <main className="mx-auto flex min-h-screen max-w-md flex-col px-4 py-8">
      <Logo />
      <div className="my-6 flex gap-2">{[0, 1, 2].map((i) => <div key={i} className={`h-1.5 flex-1 rounded-full ${i <= step ? "bg-sobbra" : "bg-black/10"}`} />)}</div>
      <form action={action} className="flex flex-1 flex-col">
        <section hidden={step !== 0} className="space-y-4">
          <h1 className="text-2xl font-bold">Oi, {name.split(" ")[0]}! Qual é o seu objetivo agora?</h1>
          {goals.map((g, i) => (
            <label key={g.v} className="card flex cursor-pointer items-center gap-3 has-[:checked]:ring-2 has-[:checked]:ring-sobbra">
              <input type="radio" name="goal" value={g.v} defaultChecked={i === 1} className="sr-only" />
              <span className="text-3xl">{g.i}</span><span><b>{g.t}</b><span className="muted block text-sm">{g.d}</span></span>
            </label>
          ))}
        </section>
        <section hidden={step !== 1} className="space-y-4">
          <h1 className="text-2xl font-bold">Quanto entra por mês, mais ou menos?</h1>
          <p className="muted">Pode ser aproximado. Serve só para o Sobbra te avisar antes de o dinheiro acabar.</p>
          <input name="income" inputMode="decimal" className="input text-2xl" placeholder="R$ 0,00" />
        </section>
        <section hidden={step !== 2} className="space-y-4">
          <h1 className="text-2xl font-bold">Onde fica seu dinheiro?</h1>
          <div><label className="label">Banco principal</label><input name="bank" className="input" placeholder="Ex.: Nubank, Itaú, Caixa" /></div>
          <div><label className="label">Quanto tem lá hoje?</label><input name="initial" inputMode="decimal" className="input" placeholder="R$ 0,00" /></div>
          <label className="flex items-center gap-2"><input type="checkbox" checked={hasCard} onChange={(e) => setHasCard(e.target.checked)} className="h-5 w-5" /> Tenho cartão de crédito</label>
          {hasCard && (
            <div className="card space-y-3">
              <div><label className="label">Nome do cartão</label><input name="card" className="input" placeholder="Ex.: Nubank" /></div>
              <div><label className="label">Limite</label><input name="limit" inputMode="decimal" className="input" placeholder="R$ 0,00" /></div>
              <div className="grid grid-cols-2 gap-3">
                <div><label className="label">Dia que fecha</label><input name="closing" type="number" min={1} max={31} defaultValue={3} className="input" /></div>
                <div><label className="label">Dia que vence</label><input name="due" type="number" min={1} max={31} defaultValue={10} className="input" /></div>
              </div>
            </div>
          )}
          <p className="muted text-sm">A Carteira (dinheiro vivo) já vem criada. Você pode adicionar outras contas depois.</p>
        </section>
        {state?.error && <p className="mt-4 text-coral">{state.error}</p>}
        <div className="mt-auto flex gap-3 pt-8">
          {step > 0 && <button type="button" className="btn-ghost flex-1" onClick={() => setStep(step - 1)}>Voltar</button>}
          {step < 2 ? <button key="next" type="button" className="btn-primary flex-1" onClick={() => setStep(step + 1)}>Continuar</button>
            : <button key="submit" type="submit" className="btn-primary flex-1" disabled={pending}>{pending ? "Preparando…" : "Começar a usar"}</button>}
        </div>
      </form>
    </main>
  );
}
