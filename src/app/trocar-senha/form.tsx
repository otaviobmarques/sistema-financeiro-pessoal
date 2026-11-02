"use client";
import { useActionState } from "react";
import { changePassword } from "../actions";
import { Logo } from "@/components/ui";

export function ChangePasswordForm({ name, forced }: { name: string; forced: boolean }) {
  const [state, action, pending] = useActionState(changePassword, undefined);
  return (
    <main className="mx-auto flex min-h-screen max-w-sm flex-col justify-center px-4">
      <div className="mb-8"><Logo size={40} /></div>
      <h1 className="text-2xl font-bold">{forced ? `Oi, ${name}! Crie a sua senha` : "Trocar senha"}</h1>
      {forced && <p className="muted mt-2">Você entrou com uma senha provisória. Escolha uma senha só sua para continuar.</p>}
      <form action={action} className="mt-6 space-y-4">
        <div><label className="label" htmlFor="current">{forced ? "Senha provisória" : "Senha atual"}</label><input id="current" name="current" type="password" autoComplete="current-password" required className="input" /></div>
        <div><label className="label" htmlFor="next">Nova senha</label><input id="next" name="next" type="password" autoComplete="new-password" minLength={8} required className="input" /></div>
        <div><label className="label" htmlFor="confirm">Repita a nova senha</label><input id="confirm" name="confirm" type="password" autoComplete="new-password" minLength={8} required className="input" /></div>
        {state?.error && <p role="alert" className="rounded-xl bg-coral/10 p-3 text-sm text-coral">{state.error}</p>}
        <button className="btn-primary w-full" disabled={pending}>{pending ? "Salvando…" : "Salvar e continuar"}</button>
      </form>
    </main>
  );
}
