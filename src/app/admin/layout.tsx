import Link from "next/link";
import { redirect } from "next/navigation";
import { requireAdmin } from "@/lib/auth";
import { Logo } from "@/components/ui";
import { AdminNav } from "./nav";
import { Credits } from "@/components/Credits";

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const me = await requireAdmin();
  if (me.mustChangePassword) redirect("/trocar-senha");
  return (
    <div className="min-h-screen">
      <header className="line border-b" style={{ background: "var(--card)" }}>
        <div className="mx-auto flex max-w-6xl flex-wrap items-center gap-x-6 gap-y-2 px-4 py-3">
          <Link href="/admin" className="flex items-center gap-2"><Logo size={28} /><span className="rounded-full bg-floresta px-2 py-0.5 text-xs font-semibold text-white">Backoffice</span></Link>
          <AdminNav />
          <div className="ml-auto flex items-center gap-3 text-sm"><span className="muted hidden sm:inline">{me.name}</span><Link href="/inicio" className="btn-ghost min-h-[40px] text-sm">Ir para o app</Link></div>
        </div>
      </header>
      <main className="mx-auto max-w-6xl px-4 py-6">{children}</main>
      <footer className="line mx-auto max-w-6xl border-t px-4 py-6"><Credits /></footer>
    </div>
  );
}
