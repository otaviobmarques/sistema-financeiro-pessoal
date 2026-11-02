"use client";
// Navegacao por tarefa (Design System, p. 8): quatro destinos no celular e os mesmos nomes na lateral clara do desktop.
// "Registrar" e acao global, nao um quinto destino.
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { SkinSwitch } from "./SkinSwitch";
import { Logo } from "./ui";
import { RegisterButton } from "./RegisterButton";
import { Credits } from "./Credits";
import { logout } from "@/app/actions";

const I = {
  home: <path d="M3 11l9-7 9 7M5 10v10h14V10" />,
  moves: <path d="M7 7h13l-3-3M17 17H4l3 3" />,
  plan: <><rect x="5" y="4" width="14" height="17" rx="2" /><path d="M9 4h6v3H9zM9 12h6M9 16h4" /></>,
  more: <path d="M5 12h.01M12 12h.01M19 12h.01" />,
};
const ADMIN = [{ href: "/admin", label: "Visão geral" }, { href: "/admin/usuarios", label: "Cadastro de usuários" }, { href: "/admin/planos", label: "Planos e preços" }, { href: "/admin/pagamentos", label: "Pagamentos" }, { href: "/admin/auditoria", label: "Auditoria" }, { href: "/", label: "Página de vendas" }];
const Icon = ({ d }: { d: React.ReactNode }) => <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden>{d}</svg>;

const PLAN = ["/plano", "/recorrentes", "/agenda", "/orcamentos", "/dividas", "/contas-a-pagar"];
const MOVES = ["/lancamentos", "/comprovantes", "/importar", "/nfce", "/lixeira"];
const main = [
  { href: "/inicio", label: "Início", icon: I.home, match: (p: string) => p === "/inicio" },
  { href: "/lancamentos", label: "Movimentos", icon: I.moves, match: (p: string) => MOVES.some((h) => p.startsWith(h)) },
  { href: "/plano", label: "Plano", icon: I.plan, match: (p: string) => PLAN.some((h) => p.startsWith(h)) },
  { href: "/mais", label: "Mais", icon: I.more, match: (p: string) => !["/inicio", ...MOVES, ...PLAN].some((h) => p === h || p.startsWith(h + "/")) },
];
const sub: Record<string, { href: string; label: string }[]> = {
  "/lancamentos": [{ href: "/lancamentos", label: "Todos os movimentos" }, { href: "/comprovantes", label: "Comprovantes" }, { href: "/nfce", label: "Nota fiscal (NFC-e)" }, { href: "/importar", label: "Importar extrato" }, { href: "/lixeira", label: "Lixeira" }],
  "/plano": [{ href: "/plano", label: "Visão do plano" }, { href: "/recorrentes", label: "Fixas e recorrentes" }, { href: "/agenda", label: "Agenda" }, { href: "/orcamentos", label: "Orçamento e metas" }, { href: "/dividas", label: "Dívidas" }, { href: "/contas-a-pagar", label: "Contas a pagar" }],
  "/mais": [{ href: "/contas", label: "Contas e cartões" }, { href: "/relatorios", label: "Central de relatórios" }, { href: "/relatorios/despesas", label: "Relatório de despesas" }, { href: "/consultor", label: "Pergunte ao Sobbra" }, { href: "/avisos", label: "Avisos" }, { href: "/ajustes", label: "Ajustes" }],
};

export function Nav({ admin, unread = 0 }: { admin: boolean; unread?: number }) {
  const path = usePathname();
  // Grupos do menu: abertos por padrao; a escolha de abrir ou recolher fica salva neste aparelho
  const [closed, setClosed] = useState<string[]>([]);
  useEffect(() => { try { setClosed(JSON.parse(localStorage.getItem("sobbra-nav") || "[]")); } catch {} }, []);
  const isOpen = (k: string) => !closed.includes(k);
  const toggle = (k: string) => { const n = closed.includes(k) ? closed.filter((x) => x !== k) : [...closed, k]; setClosed(n); try { localStorage.setItem("sobbra-nav", JSON.stringify(n)); } catch {} };
  const bell = (
    <Link href="/avisos" className="bell relative grid h-12 w-12 place-items-center rounded-xl hover:bg-black/5" aria-label={`Avisos${unread ? `, ${unread} não lidos` : ""}`}>
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden><path d="M6 16v-5a6 6 0 0112 0v5l2 2H4zM10 21h4" /></svg>
      {unread > 0 && <span className="absolute right-1 top-1 grid h-5 min-w-5 place-items-center rounded-full bg-coral px-1 text-[11px] font-bold text-white">{unread > 9 ? "9+" : unread}</span>}
    </Link>
  );
  return (
    <>
      <aside className="side line fixed inset-y-0 left-0 hidden w-64 flex-col border-r p-4 md:flex" style={{ background: "var(--card)" }}>
        <div className="mb-4 flex items-center justify-between px-2"><Link href="/inicio" aria-label="Início"><Logo size={44} /></Link>{bell}</div>
        <div className="mb-3"><RegisterButton block /></div>
        <nav aria-label="Menu" className="-mr-2 min-h-0 flex-1 overflow-y-auto pr-2">
          {main.map((m) => {
            const on = m.match(path); const items = sub[m.href] ?? []; const show = isOpen(m.href) || items.some((x) => x.href === path);
            return (
              <div key={m.href}>
                <div className="flex items-center gap-0.5">
                  {items.length ? <button type="button" className="nav-tg" aria-expanded={show} aria-controls={`sub${m.href.replace("/", "-")}`} aria-label={`${show ? "Recolher" : "Abrir"} ${m.label}`} onClick={() => toggle(m.href)}>{show ? "−" : "+"}</button> : <span className="w-[24px] shrink-0" />}
                  <Link href={m.href} aria-current={on && !items.some((x) => x.href === path && x.href !== m.href) ? "page" : undefined} className="nav-link"><Icon d={m.icon} />{m.label}</Link>
                </div>
                {items.length > 0 && show && <div id={`sub${m.href.replace("/", "-")}`} className="nav-sub">{items.filter((x) => x.href !== m.href || m.href === "/lancamentos" || m.href === "/plano").map((x) => (
                  <Link key={x.href} href={x.href} aria-current={path === x.href ? "page" : undefined}>{x.label}</Link>
                ))}</div>}
              </div>
            );
          })}
          {admin && <div className="mt-2">
            <div className="flex items-center gap-0.5"><button type="button" className="nav-tg" aria-expanded={isOpen("admin") || path.startsWith("/admin")} aria-label={`${isOpen("admin") ? "Recolher" : "Abrir"} Administração`} onClick={() => toggle("admin")}>{isOpen("admin") || path.startsWith("/admin") ? "−" : "+"}</button><span className="muted px-3 py-2 text-[11px] font-extrabold uppercase tracking-[.08em]">Administração</span></div>
            {(isOpen("admin") || path.startsWith("/admin")) && <div className="nav-sub">{ADMIN.map((x) => <Link key={x.href} href={x.href} aria-current={path === x.href ? "page" : undefined}>{x.label}</Link>)}</div>}
          </div>}
        </nav>
        <div className="mt-3 shrink-0 space-y-3 border-t border-white/10 px-2 pt-3">
          <div><span className="muted mb-1.5 block text-[11px] font-bold uppercase tracking-[.08em]">Estilo de cores</span><SkinSwitch /></div>
          <form action={logout}><button className="muted text-sm font-bold hover:underline">Sair da conta</button></form>
          <Credits compact />
        </div>
      </aside>
      <header className="line sticky top-0 z-30 flex items-center justify-between border-b px-5 md:hidden" style={{ background: "var(--bg)", paddingTop: "env(safe-area-inset-top)" }}>
        <Link href="/inicio" aria-label="Início"><Logo size={30} /></Link>{bell}
      </header>
      <div className="fixed bottom-[76px] right-4 z-40 md:hidden" style={{ marginBottom: "env(safe-area-inset-bottom)" }}><RegisterButton /></div>
      <nav className="line fixed inset-x-0 bottom-0 z-40 grid grid-cols-4 border-t pb-[env(safe-area-inset-bottom)] md:hidden" style={{ background: "var(--card)" }} aria-label="Navegação principal">
        {main.map((m) => {
          const on = m.match(path);
          return (
            <Link key={m.href} href={m.href} aria-current={on ? "page" : undefined} className="flex min-h-[64px] flex-col items-center justify-center gap-1 text-xs font-bold">
              <span className={`grid h-8 w-14 place-items-center rounded-full ${on ? "soft text-floresta dark:text-[#ECEFE6]" : "muted"}`}><Icon d={m.icon} /></span>
              <span className={on ? "" : "muted"}>{m.label}</span>
            </Link>
          );
        })}
      </nav>
    </>
  );
}
