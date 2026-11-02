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
        <ul><li>Registre gastos falando ou por foto</li><li>Veja quanto ainda sobra no mês</li><li>Guarde para o que importa: família, filhos, casa</li></ul>
        <div className="a-dash">
          <div className="a-card"><small>No seu plano, ainda há</small><b>R$ 1.284,50</b><div className="s-ph-bar"><i /></div></div>
          <div className="a-mini">
            <div className="a-tile"><small>Saúde financeira</small><svg viewBox="-16 0 232 122"><path d="M20 100 A80 80 0 0 1 180 100" fill="none" stroke="rgba(255,255,255,.15)" strokeWidth="16" strokeLinecap="round" /><path className="m-gauge" pathLength={1} d="M20 100 A80 80 0 0 1 180 100" fill="none" stroke="url(#ag)" strokeWidth="16" strokeLinecap="round" /><defs><linearGradient id="ag"><stop offset="0" stopColor="#F2545B" /><stop offset=".45" stopColor="#FFB31F" /><stop offset="1" stopColor="#12B76A" /></linearGradient></defs><text x="100" y="96" textAnchor="middle" fontSize="40" fontWeight="800" fill="#fff">78</text></svg></div>
            <div className="a-tile"><small>Faculdade da Sofia</small><div className="s-ring a-ring" style={{ ["--c" as string]: "#FFC93C", ["--v" as string]: 62, ["--i" as string]: 1 }}><svg viewBox="0 0 120 120"><circle cx="60" cy="60" r="50" /><circle className="s-ring-v" cx="60" cy="60" r="50" pathLength={100} /></svg><span>62%</span></div></div>
          </div>
        </div>
        <p className="a-quote">“Organize o hoje. Construa o futuro de quem você ama.”</p>
      </aside>
      <main className="a-main">
        <div className="a-top"><Link href="/" className="s-logo" aria-label="Sobbra, página inicial">sobbra<i>.</i></Link><Link href="/" className="a-back">← Voltar ao site</Link></div>
        {children}
        <footer className="a-foot"><span>Sistema desenvolvido pela</span><DommaMark height={30} tone="light" /></footer>
      </main>
    </div>
  );
}
