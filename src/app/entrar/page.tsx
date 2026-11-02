import type { Metadata } from "next";
import { AuthForm } from "../AuthForm";
import { AuthShell } from "../AuthShell";
export const metadata: Metadata = { title: "Entrar · Sobbra" };
export default function Page() { return <AuthShell title={<>Seu mês, <em>sob controle</em>.</>}><AuthForm mode="login" /></AuthShell>; }
