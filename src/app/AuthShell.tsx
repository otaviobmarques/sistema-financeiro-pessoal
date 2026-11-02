import Link from "next/link";
import { DommaMark } from "@/components/Credits";
import { jakarta } from "./fonts";
import "./site.css";

/** Moldura das telas de acesso: painel da marca a esquerda e formulario a direita. Credito: Domma Tecnologia. */
export function AuthShell({ title, children }: { title: React.ReactNode; children: React.ReactNode }) {
  return (
    <div className={`auth2 ${jakarta.variable}`}>
      <aside className="a-side" aria-hidden>
        <div className="s-mesh" />
        <Link href="/" className="s-logo" tabIndex={-1}>sobbra<i>.</i></Link>
        <h2>{title}</h2>
        <ul><li>Registre gastos falando ou por foto</li><li>Veja quanto ainda está livre no mês</li><li>Avisos antes das contas vencerem</li></ul>
        <div className="a-card"><small>No seu plano, ainda há</small><b>R$ 1.284,50</b><div className="s-ph-bar"><i /></div></div>
      </aside>
      <main className="a-main">
        <div className="a-top"><Link href="/" className="s-logo" aria-label="Sobbra, página inicial">sobbra<i>.</i></Link><Link href="/" className="a-back">← Voltar ao site</Link></div>
        {children}
        <footer className="a-foot"><span>Sistema desenvolvido pela</span><DommaMark height={30} tone="light" /></footer>
      </main>
    </div>
  );
}
