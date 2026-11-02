"use client";
import { useActionState, useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { createUser, updateUser, setUserActive, resetPassword, deleteUser, type AdminState } from "../actions";

type U = { id: string; name: string; email: string; phone: string | null; role: "CLIENT" | "ADMIN"; plan: "FREE" | "PRO" | "FAMILY" };

function TempPassword({ value, email }: { value: string; email: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <div className="fill-in rounded-xl border-2 border-ambar/60 bg-ambar/10 p-4">
      <p className="font-semibold">Senha provisória de {email}</p>
      <div className="mt-2 flex flex-wrap items-center gap-2">
        <code className="rounded-lg bg-black/10 px-3 py-2 text-lg font-bold tracking-wider">{value}</code>
        <button type="button" className="btn-ghost min-h-[40px] text-sm" onClick={async () => { try { await navigator.clipboard.writeText(value); setCopied(true); } catch {} }}>{copied ? "Copiada" : "Copiar"}</button>
      </div>
      <p className="muted mt-2 text-xs">Ela aparece só agora. Envie para a pessoa por um canal seguro; no primeiro acesso o sistema pede uma senha nova.</p>
    </div>
  );
}

export function UserForm({ user }: { user?: U }) {
  const [state, action, pending] = useActionState<AdminState, FormData>(user ? updateUser : createUser, undefined);
  const [role, setRole] = useState(user?.role ?? "CLIENT");
  const [manual, setManual] = useState(false);
  if (!user && state?.tempPassword) return (
    <div className="space-y-4">
      <p className="soft rounded-xl p-3 text-sm">Usuário cadastrado.</p>
      <TempPassword value={state.tempPassword} email={state.email ?? "o novo usuário"} />
      <div className="flex gap-2"><Link href={`/admin/usuarios/${state.id}`} className="btn-primary">Ver cadastro</Link><a href="/admin/usuarios/novo" className="btn-ghost">Cadastrar outro</a></div>
    </div>
  );
  return (
    <form action={action} className="card space-y-4">
      {user && <input type="hidden" name="id" value={user.id} />}
      <div>
        <span className="label">Tipo de usuário</span>
        <div className="grid gap-2 sm:grid-cols-2">
          {([["CLIENT", "Cliente", "Usa o app para controlar as próprias finanças."], ["ADMIN", "Administrador", "Acessa o backoffice: usuários, planos, métricas e auditoria."]] as const).map(([v, t, d]) => (
            <label key={v} className={`card flex cursor-pointer gap-3 ${role === v ? "ring-2 ring-sobbra" : ""}`}>
              <input type="radio" name="role" value={v} checked={role === v} onChange={() => setRole(v)} className="mt-1 h-5 w-5" />
              <span><b>{t}</b><span className="muted block text-sm">{d}</span></span>
            </label>
          ))}
        </div>
      </div>
      <div className="grid gap-3 sm:grid-cols-2">
        <div><label className="label" htmlFor="name">Nome completo</label><input id="name" name="name" required defaultValue={user?.name} className="input" /></div>
        <div><label className="label" htmlFor="email">E-mail (login)</label><input id="email" name="email" type="email" required defaultValue={user?.email} className="input" /></div>
        <div><label className="label" htmlFor="phone">Telefone (opcional)</label><input id="phone" name="phone" type="tel" defaultValue={user?.phone ?? ""} className="input" placeholder="(11) 99999-0000" /></div>
        <div><label className="label" htmlFor="plan">Plano</label><select id="plan" name="plan" defaultValue={user?.plan ?? "FREE"} className="input"><option value="FREE">Grátis</option><option value="PRO">Pro</option><option value="FAMILY">Família</option></select></div>
      </div>
      {!user && (
        <div className="space-y-2">
          <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={manual} onChange={(e) => setManual(e.target.checked)} className="h-5 w-5" /> Definir a senha eu mesmo</label>
          {manual ? <input name="password" type="text" minLength={8} className="input" placeholder="Mínimo de 8 caracteres" aria-label="Senha" />
            : <p className="muted text-sm">O sistema gera uma senha provisória, mostrada ao salvar. A pessoa troca no primeiro acesso.</p>}
        </div>
      )}
      {role === "ADMIN" && <p className="rounded-xl bg-ambar/10 p-3 text-sm">Administradores veem dados de todos os clientes no backoffice. Dê esse acesso só a quem precisa.</p>}
      {state?.error && <p role="alert" className="rounded-xl bg-coral/10 p-3 text-sm text-coral">{state.error}</p>}
      {state?.ok && <p role="status" className="soft rounded-xl p-3 text-sm">{state.ok}</p>}
      <div className="flex gap-2"><button className="btn-primary" disabled={pending}>{pending ? "Salvando…" : user ? "Salvar alterações" : "Cadastrar usuário"}</button><Link href="/admin/usuarios" className="btn-ghost">Voltar</Link></div>
    </form>
  );
}

export function UserActions({ id, email, active, isSelf }: { id: string; email: string; active: boolean; isSelf: boolean }) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [msg, setMsg] = useState<AdminState>();
  const [confirmBlock, setConfirmBlock] = useState(false);
  const [delState, delAction, delPending] = useActionState<AdminState, FormData>(deleteUser, undefined);
  const [showDel, setShowDel] = useState(false);
  return (
    <div className="card space-y-4">
      <h2 className="font-semibold">Acesso</h2>
      {msg?.tempPassword && <TempPassword value={msg.tempPassword} email={email} />}
      {msg?.error && <p className="rounded-xl bg-coral/10 p-3 text-sm text-coral">{msg.error}</p>}
      {msg?.ok && !msg.tempPassword && <p className="soft rounded-xl p-3 text-sm">{msg.ok}</p>}
      <div className="flex flex-wrap gap-2">
        <button className="btn-ghost" disabled={pending} onClick={() => start(async () => setMsg(await resetPassword(id)))}>Gerar senha provisória</button>
        {!isSelf && (active
          ? (confirmBlock
            ? <><button className="btn bg-coral text-white" disabled={pending} onClick={() => start(async () => { setMsg(await setUserActive(id, false)); setConfirmBlock(false); router.refresh(); })}>Confirmar bloqueio</button><button className="btn-ghost" onClick={() => setConfirmBlock(false)}>Cancelar</button></>
            : <button className="btn-ghost text-coral" onClick={() => setConfirmBlock(true)}>Bloquear acesso</button>)
          : <button className="btn-primary" disabled={pending} onClick={() => start(async () => { setMsg(await setUserActive(id, true)); router.refresh(); })}>Liberar acesso</button>)}
      </div>
      {!isSelf && (
        <div className="line border-t pt-4">
          {!showDel ? <button className="text-sm text-coral underline" onClick={() => setShowDel(true)}>Excluir usuário e todos os dados</button> : (
            <form action={delAction} className="space-y-2">
              <input type="hidden" name="id" value={id} />
              <p className="text-sm">Isso apaga para sempre os lançamentos, contas e comprovantes desta pessoa. Digite <b>{email}</b> para confirmar.</p>
              <div className="flex flex-wrap gap-2"><input name="confirm" className="input max-w-sm" aria-label="Confirmação" /><button className="btn bg-coral text-white" disabled={delPending}>Excluir</button><button type="button" className="btn-ghost" onClick={() => setShowDel(false)}>Cancelar</button></div>
              {delState?.error && <p className="text-sm text-coral">{delState.error}</p>}
            </form>
          )}
        </div>
      )}
      {isSelf && <p className="muted text-sm">Este é o seu cadastro. Bloqueio e exclusão ficam indisponíveis para evitar que você perca o acesso.</p>}
    </div>
  );
}
