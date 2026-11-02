import Link from "next/link";
import type { Metadata } from "next";
import { currentUserId } from "@/lib/auth";
import { getPlans } from "@/lib/plans";
import { RedboxMark } from "@/components/Credits";
import { Reveal, CountUp, Pricing, type SitePlan } from "@/components/site/SiteFx";
import { jakarta } from "./fonts";
import "./site.css";

export const metadata: Metadata = {
  title: "Sobbra: saiba quanto sobra antes do mês acabar",
  description: "Fale o gasto, fotografe o comprovante ou leia a nota fiscal. O Sobbra organiza tudo e mostra quanto ainda está livre no seu plano. Grátis para começar.",
  alternates: { canonical: "/" },
};

const STEPS = [
  ["1", "Registre do seu jeito", "Fale “gastei 42 no mercado”, tire foto do comprovante, leia o QR Code da nota ou importe o extrato do banco."],
  ["2", "O Sobbra organiza", "Categoria, conta, parcela, recorrência e a fatura certa do cartão. Você só confere e confirma."],
  ["3", "Você decide com clareza", "Veja quanto ainda está livre no mês, receba avisos antes das contas vencerem e pergunte o que quiser."],
];
const FEATS: [string, string, string, string][] = [
  ["🎙️", "Fale e pronto", "Diga o gasto em voz alta. O Sobbra entende valor, lugar, forma de pagamento e até parcelas.", "s-f-wide"],
  ["📸", "Foto do comprovante", "A IA lê valor, data e estabelecimento de recibos, cupons e prints de Pix.", ""],
  ["🧾", "Nota fiscal por item", "Leia o QR Code da nota: o mercado vira Mercado, o shampoo vira Higiene.", ""],
  ["💚", "Quanto sobra, de verdade", "O saldo do dia a dia menos as contas e faturas que ainda vão chegar. A conta aparece explicada.", "s-f-tall"],
  ["🎯", "Orçamentos e metas", "Limites por categoria que avisam aos 80% e metas que dizem quanto guardar por mês.", ""],
  ["🔔", "Avisos que salvam", "Conta vencendo, fatura fechando e orçamento estourando: você sabe antes.", ""],
  ["💬", "Consultor de bolso", "“Posso comprar um celular de 3 mil?” Ele olha os seus números e responde com a conta.", ""],
  ["📊", "Relatórios bonitos", "Despesas por categoria, fluxo de caixa e comparativo do ano em PDF ou imagem.", "s-f-rest"],
];
const FAQ = [
  ["Preciso dar a senha do meu banco?", "Não. Você registra falando, por foto, pela nota fiscal ou importando o extrato que você mesmo baixa. O Sobbra nunca pede senha de banco."],
  ["Funciona no celular?", "Sim. Abra sobbra.com.br no celular e toque em “Adicionar à tela inicial”: ele vira um app, sem precisar de loja."],
  ["Meus dados estão seguros?", "Os comprovantes ficam criptografados, a conexão é sempre protegida e você exporta ou apaga tudo quando quiser, como manda a LGPD. Não temos anúncios e não vendemos dados."],
  ["O plano grátis é grátis mesmo?", "É. Sem cartão de crédito e sem prazo. Os planos pagos liberam mais leituras com IA, o consultor ampliado e recursos para a família."],
  ["Posso cancelar quando quiser?", "Pode, direto nos Ajustes do app, em dois toques. Você continua com o plano até o fim do período já pago."],
  ["Serve para casal ou família?", "Sim. No plano Família, até 5 pessoas usam a mesma conta, com orçamento e contas a pagar compartilhados."],
];

export default async function Landing({ searchParams }: { searchParams: Promise<{ excluida?: string }> }) {
  const [logged, sp, plans] = await Promise.all([currentUserId(), searchParams, getPlans()]);
  const list: SitePlan[] = Object.values(plans).filter((p) => p.active).map((p) => ({ code: p.code, name: p.name, description: p.description, price: p.price, yearly: p.yearly, receipts: p.receipts, chat: p.chat, members: p.members, trialDays: p.trialDays, features: p.features }));
  const featured = Object.values(plans).find((p) => p.featured && p.active)?.code ?? "";
  const cta = logged ? { href: "/inicio", label: "Abrir o app" } : { href: "/cadastro", label: "Criar minha conta grátis" };
  return (
    <div className={`site ${jakarta.variable}`}>
      <Reveal />
      <a href="#conteudo" className="s-skip">Pular para o conteúdo</a>
      <header className="s-nav">
        <div className="s-wrap s-nav-in">
          <Link href="/" className="s-logo" aria-label="Sobbra, página inicial">sobbra<i>.</i></Link>
          <nav aria-label="Seções" className="s-links"><a href="#como">Como funciona</a><a href="#recursos">Recursos</a><a href="#planos">Planos</a><a href="#duvidas">Dúvidas</a></nav>
          <div className="s-nav-cta">{logged ? <Link className="s-btn s-btn-sun s-btn-sm" href="/inicio">Abrir o app</Link> : <><Link className="s-btn s-btn-ghost s-btn-sm" href="/entrar">Entrar</Link><Link className="s-btn s-btn-sun s-btn-sm" href="/cadastro">Começar grátis</Link></>}</div>
        </div>
      </header>

      <main id="conteudo">
        {sp.excluida && <div className="s-wrap s-note" role="status">Sua conta e todos os seus dados foram excluídos.</div>}
        <section className="s-hero">
          <div className="s-mesh" aria-hidden />
          <div className="s-wrap s-hero-in">
            <div className="s-hero-copy">
              <span className="s-chip s-in1"><span className="s-dot" /> Novo: registre gastos falando</span>
              <h1 className="s-in2">Saiba quanto <em>sobra</em> antes do mês acabar.</h1>
              <p className="s-lead s-in3">Fale o gasto, fotografe o comprovante ou leia a nota fiscal. O Sobbra organiza tudo sozinho e mostra, na hora, quanto ainda está livre no seu plano.</p>
              <div className="s-ctas s-in4"><Link className="s-btn s-btn-sun s-btn-lg" href={cta.href}>{cta.label} <span aria-hidden>→</span></Link><a className="s-btn s-btn-glass s-btn-lg" href="#como">Ver como funciona</a></div>
              <ul className="s-trust s-in5"><li>Grátis para começar</li><li>Sem cartão de crédito</li><li>Não pede senha do banco</li><li>Cancele em 2 toques</li></ul>
            </div>
            <div className="s-stage" aria-label="Exemplo do app com dados fictícios">
              <div className="s-phone">
                <div className="s-notch" />
                <div className="s-screen">
                  <p className="s-ph-eyebrow">No seu plano, ainda há</p>
                  <p className="s-ph-big"><CountUp cents={128450} /></p>
                  <p className="s-ph-sub">até 30 de novembro</p>
                  <div className="s-ph-bar"><i /></div>
                  <div className="s-ph-chart" aria-hidden>{[38, 62, 45, 80, 56, 92, 70].map((h, i) => <span key={i} style={{ ["--h" as string]: `${h}%`, ["--d" as string]: `${0.6 + i * 0.08}s` }} />)}</div>
                  <ul className="s-ph-list">
                    <li style={{ ["--d" as string]: "1.4s" }}><span>🛒</span><b>Mercado</b><em>− R$ 42,00</em></li>
                    <li style={{ ["--d" as string]: "1.7s" }}><span>⛽</span><b>Posto</b><em>− R$ 150,00</em></li>
                    <li style={{ ["--d" as string]: "2s" }}><span>💼</span><b>Salário</b><em className="s-pos">+ R$ 4.800,00</em></li>
                  </ul>
                </div>
              </div>
              <div className="s-float s-float-a"><span className="s-mic">🎙️</span>“Gastei 42 no mercado no débito”</div>
              <div className="s-float s-float-b"><b>✓ Lançado</b> em Mercado</div>
              <div className="s-float s-float-c"><span>💳</span><div><b>Fatura do cartão</b><small>fecha dia 3 · R$ 1.230,00</small></div></div>
            </div>
          </div>
          <div className="s-wrap s-fict">Imagem ilustrativa com valores fictícios.</div>
        </section>

        <section className="s-sec">
          <div className="s-wrap">
            <h2 className="s-h2" data-r>Controlar dinheiro não devia dar trabalho.</h2>
            <div className="s-pains">
              {[["📉", "A planilha morre no dia 10", "Anotar tudo à mão cansa. Uma semana sem atualizar e ela já não serve para nada."], ["🔐", "O app pede a senha do banco", "Muita gente desiste aqui, e com razão. Sua senha não precisa sair do seu banco."], ["😬", "A fatura chega e assusta", "O problema não é gastar: é descobrir só no fim do mês quanto já foi."]].map(([i, t, d]) => (
                <div className="s-pain" key={t} data-r><span className="s-pain-i">{i}</span><h3>{t}</h3><p>{d}</p></div>
              ))}
            </div>
            <p className="s-turn" data-r>Com o Sobbra, registrar um gasto leva <b>segundos</b>, e você nunca mais é pego de surpresa.</p>
          </div>
        </section>

        <section id="como" className="s-sec s-sec-alt">
          <div className="s-wrap">
            <p className="s-eyebrow" data-r>Como funciona</p>
            <h2 className="s-h2" data-r>Três passos. Nenhuma planilha.</h2>
            <ol className="s-steps">{STEPS.map(([n, t, d]) => <li key={n} data-r><span className="s-step-n">{n}</span><h3>{t}</h3><p>{d}</p></li>)}</ol>
          </div>
        </section>

        <section id="recursos" className="s-sec">
          <div className="s-wrap">
            <p className="s-eyebrow" data-r>Recursos</p>
            <h2 className="s-h2" data-r>Tudo o que você precisa para o dinheiro render.</h2>
            <div className="s-bento">{FEATS.map(([i, t, d, c]) => <article key={t} className={`s-feat ${c}`} data-r><span className="s-feat-i" aria-hidden>{i}</span><h3>{t}</h3><p>{d}</p></article>)}</div>
          </div>
        </section>

        <section className="s-sec s-dark">
          <div className="s-wrap s-split">
            <div data-r>
              <p className="s-eyebrow s-eyebrow-sun">Segurança e privacidade</p>
              <h2 className="s-h2">Seu dinheiro. Seus dados. Suas regras.</h2>
              <p className="s-lead">O Sobbra foi feito para quem quer organizar a vida financeira sem abrir mão da privacidade.</p>
            </div>
            <ul className="s-checks" data-r>
              <li><b>Sem senha de banco.</b> Você decide o que entra no app.</li>
              <li><b>Comprovantes criptografados.</b> Só você tem acesso.</li>
              <li><b>LGPD de verdade.</b> Exporte ou apague tudo quando quiser.</li>
              <li><b>Sem anúncios e sem venda de dados.</b> Quem paga é o assinante, não o anunciante.</li>
            </ul>
          </div>
        </section>

        <section className="s-sec">
          <div className="s-wrap">
            <p className="s-eyebrow" data-r>Para quem é</p>
            <h2 className="s-h2" data-r>Feito para a vida real.</h2>
            <div className="s-uses">
              {[["Quem quer chegar ao fim do mês com folga", "Veja o que já está comprometido e quanto pode gastar sem culpa."], ["Quem vive no cartão de crédito", "Saiba o valor da próxima fatura antes de ela fechar."], ["Quem quer sair das dívidas", "Monte um plano de quitação e veja a data em que fica livre."], ["Casais e famílias", "Contas, orçamento e metas compartilhados, cada um no seu celular."]].map(([t, d]) => <div className="s-use" key={t} data-r><h3>{t}</h3><p>{d}</p></div>)}
            </div>
          </div>
        </section>

        <section id="planos" className="s-sec s-sec-alt">
          <div className="s-wrap">
            <p className="s-eyebrow s-center" data-r>Planos</p>
            <h2 className="s-h2 s-center" data-r>Comece grátis. Evolua quando quiser.</h2>
            <Pricing plans={list} featured={featured} />
          </div>
        </section>

        <section id="duvidas" className="s-sec">
          <div className="s-wrap s-faq-wrap">
            <h2 className="s-h2" data-r>Perguntas frequentes</h2>
            <div className="s-faq">{FAQ.map(([q, a]) => <details key={q} data-r><summary>{q}</summary><p>{a}</p></details>)}</div>
          </div>
        </section>

        <section className="s-final">
          <div className="s-mesh" aria-hidden />
          <div className="s-wrap s-final-in" data-r>
            <h2>Seu próximo mês pode ser diferente.</h2>
            <p>Crie sua conta em menos de um minuto e registre o primeiro gasto falando.</p>
            <Link className="s-btn s-btn-sun s-btn-lg" href={cta.href}>{cta.label} <span aria-hidden>→</span></Link>
          </div>
        </section>
      </main>

      <footer className="s-foot">
        <div className="s-wrap s-foot-in">
          <div><Link href="/" className="s-logo">sobbra<i>.</i></Link><p className="s-muted">Seu dinheiro, mais espaço para você.</p></div>
          <nav aria-label="Rodapé" className="s-foot-links"><a href="#como">Como funciona</a><a href="#planos">Planos</a><a href="#duvidas">Dúvidas</a><Link href="/entrar">Entrar</Link><Link href="/cadastro">Criar conta</Link></nav>
          <div className="s-by"><span>Site criado por</span><RedboxMark height={22} tone="dark" /></div>
        </div>
        <div className="s-wrap s-copy">© {new Date().getFullYear()} Sobbra. Todos os direitos reservados.</div>
      </footer>
    </div>
  );
}
