import { UserForm } from "../form";

export default function NovoUsuario() {
  return (
    <div className="mx-auto max-w-2xl">
      <h1 className="mb-1 text-xl font-bold">Novo usuário</h1>
      <p className="muted mb-4 text-sm">Cadastre um cliente do app ou um administrador do backoffice.</p>
      <UserForm />
    </div>
  );
}
