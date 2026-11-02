"use client";
import { useActionState } from "react";
import Link from "next/link";
import { login, signup } from "./actions";
import { Logo } from "@/components/ui";

export function AuthForm({ mode }: { mode: "login" | "signup" }) {
  const [state, action, pending] = useActionState(mode === "login" ? login : signup, undefined);
  return (
    <main className="mx-auto flex min-h-screen max-w-sm flex-col justify-center px-4">
      <Link href="/" className="mb-8"><Logo size={40} /></Link>
      <h1 className="mb-6 text-2xl font-bold">{mode === "login" ? "Que bom te ver de novo" : "Crie sua conta grátis"}</h1>
      <form action={action} className="space-y-4">
        {mode === "signup" && <div><label className="label" htmlFor="name">Como podemos te chamar?</label><input id="name" name="name" className="input" autoComplete="given-name" required /></div>}
        <div><label className="label" htmlFor="email">E-mail</label><input id="email" name="email" type="email" className="input" autoComplete="email" required /></div>
        <div><label className="label" htmlFor="password">Senha</label><input id="password" name="password" type="password" className="input" autoComplete={mode === "login" ? "current-password" : "new-password"} minLength={mode === "signup" ? 8 : undefined} required /></div>
        {state?.error && <p role="alert" className="rounded-xl bg-coral/10 p-3 text-sm text-coral">{state.error}</p>}
        <button className="btn-primary w-full" disabled={pending}>{pending ? "Aguarde…" : mode === "login" ? "Entrar" : "Criar conta"}</button>
      </form>
      <p className="muted mt-6 text-center text-sm">
        {mode === "login" ? <>Ainda não tem conta? <Link className="font-semibold text-sobbra" href="/cadastro">Criar grátis</Link></> : <>Já tem conta? <Link className="font-semibold text-sobbra" href="/entrar">Entrar</Link></>}
      </p>
      {mode === "signup" && <p className="muted mt-4 text-center text-xs">Ao criar a conta você concorda com os Termos de Uso e a Política de Privacidade. Seus dados nunca são usados para treinar IA de terceiros.</p>}
    </main>
  );
}
