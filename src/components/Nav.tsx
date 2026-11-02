"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Logo } from "./ui";

const items = [
  { href: "/inicio", label: "Início", icon: "🏠" },
  { href: "/lancamentos", label: "Lançamentos", icon: "📋" },
  { href: "/comprovantes", label: "Comprovantes", icon: "📷" },
  { href: "/consultor", label: "Pergunte", icon: "💬" },
  { href: "/mais", label: "Mais", icon: "☰" },
];
const extra = [
  { href: "/contas", label: "Contas e cartões", icon: "💳" },
  { href: "/orcamentos", label: "Orçamentos e metas", icon: "🎯" },
  { href: "/dividas", label: "Dívidas", icon: "🧯" },
  { href: "/importar", label: "Importar extrato", icon: "📥" },
  { href: "/nfce", label: "Nota fiscal (NFC-e)", icon: "🧾" },
  { href: "/contas-a-pagar", label: "Contas a pagar", icon: "🧾" },
  { href: "/agenda", label: "Agenda", icon: "📅" },
  { href: "/recorrentes", label: "Fixas e recorrentes", icon: "🔁" },
  { href: "/relatorios/despesas", label: "Relatório de despesas", icon: "🧾" },
  { href: "/relatorios", label: "Onde gasto mais", icon: "📊" },
  { href: "/lixeira", label: "Lixeira", icon: "🗑️" },
  { href: "/ajustes", label: "Ajustes", icon: "⚙️" },
];

export function Nav({ admin, unread = 0 }: { admin: boolean; unread?: number }) {
  const path = usePathname();
  const active = (h: string) => path === h || (path.startsWith(h + "/") && !(h === "/relatorios" && path.startsWith("/relatorios/despesas")));
  return (
    <>
      <aside className="line fixed inset-y-0 left-0 hidden w-60 flex-col gap-1 overflow-y-auto border-r p-4 md:flex" style={{ background: "var(--card)" }}>
        <div className="mb-6 flex items-center justify-between px-2"><Link href="/inicio"><Logo /></Link>
          <Link href="/avisos" className="relative grid h-10 w-10 place-items-center rounded-xl text-xl hover:bg-black/5" aria-label={`Avisos${unread ? `, ${unread} não lidos` : ""}`}>🔔{unread > 0 && <span className="absolute -right-0.5 -top-0.5 grid h-5 min-w-5 place-items-center rounded-full bg-coral px-1 text-[11px] font-bold text-white">{unread > 9 ? "9+" : unread}</span>}</Link></div>
        {[...items.filter((i) => i.href !== "/mais"), ...extra, ...(admin ? [{ href: "/admin", label: "Backoffice", icon: "🛠️" }] : [])].map((i) => (
          <Link key={i.href} href={i.href} className={`flex min-h-[44px] items-center gap-3 rounded-xl px-3 font-medium ${active(i.href) ? "soft text-floresta dark:text-sobbra" : "muted hover:bg-black/5"}`}>
            <span aria-hidden>{i.icon}</span>{i.label}
          </Link>
        ))}
      </aside>
      <header className="line sticky top-0 z-30 flex items-center justify-between border-b px-4 py-2 md:hidden" style={{ background: "var(--card)", paddingTop: "max(0.5rem, env(safe-area-inset-top))" }}>
        <Link href="/inicio"><Logo size={28} /></Link>
        <Link href="/avisos" className="relative grid h-10 w-10 place-items-center rounded-xl text-xl" aria-label={`Avisos${unread ? `, ${unread} não lidos` : ""}`}>🔔{unread > 0 && <span className="absolute -right-0.5 -top-0.5 grid h-5 min-w-5 place-items-center rounded-full bg-coral px-1 text-[11px] font-bold text-white">{unread > 9 ? "9+" : unread}</span>}</Link>
      </header>
      <nav className="line fixed inset-x-0 bottom-0 z-40 grid grid-cols-5 border-t pb-[env(safe-area-inset-bottom)] md:hidden" style={{ background: "var(--card)" }}>
        {items.map((i) => (
          <Link key={i.href} href={i.href} className={`flex min-h-[60px] flex-col items-center justify-center text-[11px] font-medium ${active(i.href) ? "text-sobbra" : "muted"}`}>
            <span className="text-xl" aria-hidden>{i.icon}</span>{i.label}
          </Link>
        ))}
      </nav>
    </>
  );
}
