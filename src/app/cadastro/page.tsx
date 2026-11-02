import type { Metadata } from "next";
import { AuthForm } from "../AuthForm";
import { AuthShell } from "../AuthShell";
import { getPlans } from "@/lib/plans";
export const metadata: Metadata = { title: "Criar conta grátis · Sobbra" };
export default async function Page({ searchParams }: { searchParams: Promise<{ plano?: string }> }) {
  const { plano } = await searchParams; const plans = await getPlans();
  const p = plano && plano in plans ? plans[plano as keyof typeof plans] : null;
  return <AuthShell title={<>Saiba quanto <em>sobra</em> antes do mês acabar.</>}><AuthForm mode="signup" planName={p && p.active ? p.name : undefined} /></AuthShell>;
}
