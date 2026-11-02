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
  { href: "/agenda", label: "Agenda", icon: "📅" },
  { href: "/recorrentes", label: "Fixas e recorrentes", icon: "🔁" },
  { href: "/relatorios/despesas", label: "Relatório de despesas", icon: "🧾" },
  { href: "/relatorios", label: "Onde gasto mais", icon: "📊" },
  { href: "/lixeira", label: "Lixeira", icon: "🗑️" },
  { href: "/ajustes", label: "Ajustes", icon: "⚙️" },
];

export function Nav({ admin }: { admin: boolean }) {
  const path = usePathname();
  const active = (h: string) => path === h || (path.startsWith(h + "/") && !(h === "/relatorios" && path.startsWith("/relatorios/despesas")));
  return (
    <>
      <aside className="line fixed inset-y-0 left-0 hidden w-60 flex-col gap-1 border-r p-4 md:flex" style={{ background: "var(--card)" }}>
        <Link href="/inicio" className="mb-6 px-2"><Logo /></Link>
        {[...items.filter((i) => i.href !== "/mais"), ...extra, ...(admin ? [{ href: "/admin", label: "Backoffice", icon: "🛠️" }] : [])].map((i) => (
          <Link key={i.href} href={i.href} className={`flex min-h-[44px] items-center gap-3 rounded-xl px-3 font-medium ${active(i.href) ? "soft text-floresta dark:text-sobbra" : "muted hover:bg-black/5"}`}>
            <span aria-hidden>{i.icon}</span>{i.label}
          </Link>
        ))}
      </aside>
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
