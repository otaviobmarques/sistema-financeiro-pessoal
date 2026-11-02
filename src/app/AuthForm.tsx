"use client";
import { useActionState, useState } from "react";
import Link from "next/link";
import { login, signup } from "./actions";

export function PasswordInput({ id, name, autoComplete, minLength, meter = false }: { id: string; name: string; autoComplete: string; minLength?: number; meter?: boolean }) {
  const [show, setShow] = useState(false); const [v, setV] = useState("");
  const s = [v.length >= 8, /[a-z]/.test(v) && /[A-Z]/.test(v), /\d/.test(v), /[^A-Za-z0-9]/.test(v)].filter(Boolean).length;
  return (
    <>
      <div className="a-input">
        <input id={id} name={name} type={show ? "text" : "password"} autoComplete={autoComplete} minLength={minLength} required value={v} onChange={(e) => setV(e.target.value)} style={{ paddingRight: 72 }} />
        <button type="button" className="a-eye" onClick={() => setShow(!show)} aria-label={show ? "Esconder senha" : "Mostrar senha"} aria-pressed={show}>{show ? "Esconder" : "Mostrar"}</button>
      </div>
      {meter && <><div className="a-meter" aria-hidden><i style={{ width: `${(s / 4) * 100}%`, background: ["#F2545B", "#F2545B", "#FFB31F", "#12B76A", "#0B8A5C"][s] }} /></div>
        <span className="a-hint" aria-live="polite">{v ? ["Muito fraca", "Fraca", "Razoável", "Boa", "Forte"][s] + (v.length < 8 ? " · use pelo menos 8 caracteres" : "") : "Use 8 ou mais caracteres, com letras e números."}</span></>}
    </>
  );
}

export function AuthForm({ mode, planName }: { mode: "login" | "signup"; planName?: string }) {
  const [state, action, pending] = useActionState(mode === "login" ? login : signup, undefined);
  const login_ = mode === "login";
  // Campos controlados: o React limpa o formulario apos enviar, e quem errou a senha nao deve redigitar o e-mail.
  const [name, setName] = useState(""); const [email, setEmail] = useState("");
  return (
    <form action={action} className="a-form" noValidate={false}>
      {!login_ && planName && <span className="a-plan">Plano escolhido: {planName}</span>}
      <h1>{login_ ? "Que bom te ver de novo" : "Crie sua conta grátis"}</h1>
      <p className="a-sub">{login_ ? "Entre para ver quanto ainda sobra no seu mês." : "Leva menos de um minuto. Sem cartão de crédito."}</p>
      {!login_ && <div className="a-field"><label htmlFor="name">Como podemos te chamar?</label><div className="a-input"><input id="name" name="name" autoComplete="given-name" required value={name} onChange={(e) => setName(e.target.value)} /></div></div>}
      <div className="a-field"><label htmlFor="email">E-mail</label><div className="a-input"><input id="email" name="email" type="email" autoComplete="email" inputMode="email" required value={email} onChange={(e) => setEmail(e.target.value)} /></div></div>
      <div className="a-field"><label htmlFor="password">Senha</label><PasswordInput id="password" name="password" autoComplete={login_ ? "current-password" : "new-password"} minLength={login_ ? undefined : 8} meter={!login_} /></div>
      {state?.error && <p role="alert" className="a-err">{state.error}</p>}
      <button className="s-btn s-btn-em" disabled={pending}>{pending ? "Aguarde…" : login_ ? "Entrar" : "Criar minha conta"}</button>
      <p className="a-alt">{login_ ? <>Ainda não tem conta? <Link href="/cadastro">Criar grátis</Link></> : <>Já tem conta? <Link href="/entrar">Entrar</Link></>}</p>
      {!login_ && <p className="a-legal">Ao criar a conta você concorda com os Termos de Uso e a Política de Privacidade. Seus dados nunca são usados para treinar IA de terceiros.</p>}
      {login_ && <p className="a-legal">Esqueceu a senha? Fale com o suporte do Sobbra para receber uma senha provisória.</p>}
    </form>
  );
}
