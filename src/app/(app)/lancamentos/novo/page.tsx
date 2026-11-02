import Link from "next/link";
import { requireUser } from "@/lib/auth";
import { TxForm } from "@/components/TxForm";
import { formData } from "../data";

export default async function Novo({ searchParams }: { searchParams: Promise<{ recorrente?: string }> }) {
  const sp = await searchParams;
  const user = await requireUser();
  const f = await formData(user.id);
  if (!f.accounts.length) return <p className="card">Cadastre uma conta primeiro em <Link className="text-sobbra" href="/contas">Contas e cartões</Link>.</p>;
  return (<><h1 className="mb-4 text-center text-xl font-bold">{sp.recorrente === "1" ? "Nova despesa fixa" : "Adicionar"}</h1><TxForm {...f} recurring={sp.recorrente === "1"} /></>);
}
