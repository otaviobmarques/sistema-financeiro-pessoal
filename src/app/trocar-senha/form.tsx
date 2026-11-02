"use client";
import { useActionState } from "react";
import { changePassword } from "../actions";
import { PasswordInput } from "../AuthForm";

export function ChangePasswordForm({ name, forced }: { name: string; forced: boolean }) {
  const [state, action, pending] = useActionState(changePassword, undefined);
  return (
    <form action={action} className="a-form">
      <h1>{forced ? `Oi, ${name}! Crie a sua senha` : "Trocar senha"}</h1>
      <p className="a-sub">{forced ? "Você entrou com uma senha provisória. Escolha uma senha só sua para continuar." : "Por segurança, confirme a senha atual."}</p>
      <div className="a-field"><label htmlFor="current">{forced ? "Senha provisória" : "Senha atual"}</label><PasswordInput id="current" name="current" autoComplete="current-password" /></div>
      <div className="a-field"><label htmlFor="next">Nova senha</label><PasswordInput id="next" name="next" autoComplete="new-password" minLength={8} meter /></div>
      <div className="a-field"><label htmlFor="confirm">Repita a nova senha</label><PasswordInput id="confirm" name="confirm" autoComplete="new-password" minLength={8} /></div>
      {state?.error && <p role="alert" className="a-err">{state.error}</p>}
      <button className="s-btn s-btn-em" disabled={pending}>{pending ? "Salvando…" : "Salvar e continuar"}</button>
    </form>
  );
}
