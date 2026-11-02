"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";

const items = [["/admin", "Visão geral"], ["/admin/usuarios", "Usuários"], ["/admin/auditoria", "Auditoria"]];

export function AdminNav() {
  const path = usePathname();
  return (
    <nav className="flex gap-1">
      {items.map(([href, label]) => {
        const on = href === "/admin" ? path === href : path.startsWith(href);
        return <Link key={href} href={href} className={`rounded-lg px-3 py-2 text-sm font-medium ${on ? "soft text-floresta dark:text-sobbra" : "muted"}`}>{label}</Link>;
      })}
    </nav>
  );
}
