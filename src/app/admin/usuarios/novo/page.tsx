import { UserForm } from "../form";
import { getPlans } from "@/lib/plans";

export default async function NovoUsuario() {
  const plans = await getPlans();
  return (
    <div className="mx-auto max-w-2xl">
      <h1 className="mb-1 text-xl font-bold">Novo usuário</h1>
      <p className="muted mb-4 text-sm">Cadastre um cliente do app ou um administrador do backoffice.</p>
      <UserForm plans={Object.values(plans).map((x) => ({ code: x.code, name: x.name }))} />
    </div>
  );
}
