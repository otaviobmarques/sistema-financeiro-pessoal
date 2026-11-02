import Link from "next/link";
import type { Metadata } from "next";
import { currentUserId } from "@/lib/auth";
import { getPlans } from "@/lib/plans";
import { RedboxMark } from "@/components/Credits";
import { Reveal, CountUp, Pricing, ScrollFx, Typed, Simulator, type SitePlan } from "@/components/site/SiteFx";
import { jakarta } from "./fonts";
import "./site.css";

export const metadata: Metadata = {
  title: "Sobbra: organize o hoje, construa o futuro da sua família",
  description: "Registre gastos falando ou por foto, veja quanto ainda sobra no mês e transforme o que sobra em metas para você e sua família. Grátis para começar.",
  alternates: { canonical: "/" },
};

const MARQUEE = ["🎙️ Registro por voz", "📸 Foto do comprovante", "🧾 Nota fiscal por item", "🎯 Metas da família", "🔔 Avisos antes de vencer", "📊 Relatórios em PDF", "💬 Consultor de bolso", "💳 Fatura do cartão em dia", "🧯 Plano para sair das dívidas", "👨‍👩‍👧 Plano Família"];
const DAY: [string, string, string, string, string][] = [
  ["7h40", "☕", "O café da padaria", "Você fala “gastei 18 na padaria” enquanto sai. Pronto: lançado em Alimentação, sem abrir planilha.", "🎙️ “Gastei 18 na padaria” → Alimentação ✓"],
  ["12h30", "🍽️", "O almoço com a equipe", "Tira foto do comprovante. A IA lê o valor, a data e o restaurante. Você só confere.", "📸 Restaurante Sabor · R$ 42,90 ✓"],
  ["18h10", "🛒", "O mercado da semana", "Lê o QR Code da nota: o arroz vai para Mercado, o shampoo para Higiene, o refrigerante para Bebidas.", "🧾 9 itens separados em 3 categorias ✓"],
  ["20h00", "🔔", "O aviso que salva o mês", "“A conta de luz vence amanhã” e “o orçamento de Lazer chegou a 80%”. Você decide antes, não depois.", "🔔 Luz vence amanhã · R$ 187,00"],
  ["21h30", "👨‍👩‍👧", "A conversa em família", "Vocês olham juntos quanto sobra no mês e quanto já guardaram para a viagem e para a faculdade das crianças.", "🎯 Faculdade da Sofia · 62% ✓"],
];
const GOALS: [string, string, number, string, string][] = [
  ["🛟", "Reserva de emergência", 78, "6 meses de tranquilidade", "#12B76A"],
  ["🎓", "Faculdade dos filhos", 62, "guardando R$ 350 por mês", "#7C5CFF"],
  ["🏠", "Entrada da casa própria", 41, "faltam 2 anos e meio", "#2E9BFF"],
  ["✈️", "Viagem em família", 90, "embarque em julho", "#FFB31F"],
];
const FEATS: [string, string, string, string][] = [
  ["🎙️", "Fale e pronto", "Diga o gasto em voz alta. O Sobbra entende valor, lugar, forma de pagamento e até parcelas.", "s-f-wide"],
  ["📸", "Foto do comprovante", "A IA lê valor, data e estabelecimento de recibos, cupons e prints de Pix.", ""],
  ["🧾", "Nota fiscal por item", "Leia o QR Code: cada item vai para a categoria certa.", ""],
  ["💚", "Quanto sobra, de verdade", "Saldo do dia a dia menos as contas e faturas que ainda vão chegar. A conta aparece explicada.", "s-f-tall"],
  ["🎯", "Orçamentos e metas", "Limites que avisam aos 80% e metas que dizem quanto guardar por mês.", ""],
  ["🩺", "Saúde financeira", "Uma nota de 0 a 100 que mostra o que melhorar primeiro.", ""],
  ["💬", "Consultor de bolso", "“Posso comprar um celular de 3 mil?” Ele olha os seus números e responde com a conta.", ""],
  ["📊", "Relatórios bonitos", "Despesas por categoria, fluxo de caixa e comparativo do ano em PDF ou imagem.", "s-f-rest"],
];
const FAQ = [
  ["Preciso dar a senha do meu banco?", "Não. Você registra falando, por foto, pela nota fiscal ou importando o extrato que você mesmo baixa. O Sobbra nunca pede senha de banco."],
  ["Funciona no celular?", "Sim. Abra sobbra.com.br no celular e toque em “Adicionar à tela inicial”: ele vira um app, sem precisar de loja."],
  ["Serve para casal ou família?", "Sim. No plano Família, até 5 pessoas usam a mesma conta, cada uma no seu celular, com orçamento, contas e metas compartilhados."],
  ["Nunca consegui controlar meu dinheiro. Vai funcionar para mim?", "O Sobbra foi feito para quem desistiu da planilha. Registrar leva segundos, e o app avisa o que importa. Você não precisa entender de finanças."],
  ["Meus dados estão seguros?", "Os comprovantes ficam criptografados, a conexão é sempre protegida e você exporta ou apaga tudo quando quiser, como manda a LGPD. Não temos anúncios e não vendemos dados."],
  ["O plano grátis é grátis mesmo?", "É. Sem cartão de crédito e sem prazo. Os planos pagos liberam mais leituras com IA, o consultor ampliado e recursos para a família."],
  ["Posso cancelar quando quiser?", "Pode, direto nos Ajustes do app, em dois toques. Você continua com o plano até o fim do período já pago."],
];

function AppMock() {
  return (
    <div className="m-win" aria-hidden>
      <div className="m-bar"><i /><i /><i /><span>app.sobbra.com.br/inicio</span></div>
      <div className="m-body">
        <aside className="m-side"><b className="m-logo">sobbra<i>.</i></b><span className="m-reg">Registrar +</span>
          {["Início", "Movimentos", "Plano", "Mais"].map((x, k) => <span key={x} className={`m-nav ${k === 0 ? "on" : ""}`}>{x}</span>)}
          <span className="m-sub">Orçamento e metas</span><span className="m-sub">Contas a pagar</span><span className="m-sub">Relatórios</span></aside>
        <div className="m-main">
          <p className="m-hi">OLÁ, ANA</p><p className="m-h1">Seu dinheiro, <em>sob controle.</em></p>
          <div className="m-row">
            <div className="m-hero"><small>No seu plano, ainda há</small><b><CountUp cents={128450} /></b><span className="m-btn">Entender meu plano →</span></div>
            <div className="m-card m-health"><small>Saúde financeira</small>
              <svg viewBox="-16 0 232 122"><path d="M20 100 A80 80 0 0 1 180 100" fill="none" stroke="#E4EAE6" strokeWidth="16" strokeLinecap="round" /><path className="m-gauge" pathLength={1} d="M20 100 A80 80 0 0 1 180 100" fill="none" stroke="url(#mg)" strokeWidth="16" strokeLinecap="round" /><defs><linearGradient id="mg"><stop offset="0" stopColor="#F2545B" /><stop offset=".45" stopColor="#FFB31F" /><stop offset="1" stopColor="#12B76A" /></linearGradient></defs><text x="100" y="92" textAnchor="middle" fontSize="36" fontWeight="800" fill="#0F1E19">78</text><text x="100" y="110" textAnchor="middle" fontSize="11" fill="#5E6F68">de 100</text></svg></div>
          </div>
          <div className="m-kpis">{[["Entradas", "+ R$ 6.200", "#12B76A"], ["Saídas", "− R$ 3.815", "#F2545B"], ["Resultado", "+ R$ 2.385", "#7C5CFF"], ["Guardado", "R$ 18.400", "#2E9BFF"]].map(([l, v, c]) => (
            <div key={l} className="m-kpi"><span style={{ background: c }} /><small>{l}</small><b>{v}</b></div>))}</div>
        </div>
      </div>
    </div>
  );
}

export default async function Landing({ searchParams }: { searchParams: Promise<{ excluida?: string }> }) {
  const [logged, sp, plans] = await Promise.all([currentUserId(), searchParams, getPlans()]);
  const list: SitePlan[] = Object.values(plans).filter((p) => p.active).map((p) => ({ code: p.code, name: p.name, description: p.description, price: p.price, yearly: p.yearly, receipts: p.receipts, chat: p.chat, members: p.members, trialDays: p.trialDays, features: p.features }));
  const featured = Object.values(plans).find((p) => p.featured && p.active)?.code ?? "";
  const cta = logged ? { href: "/inicio", label: "Abrir o app" } : { href: "/cadastro", label: "Começar grátis agora" };
  return (
    <div className={`site ${jakarta.variable}`}>
      <Reveal /><ScrollFx />
      <a href="#conteudo" className="s-skip">Pular para o conteúdo</a>
      <header className="s-nav">
        <div className="s-wrap s-nav-in">
          <Link href="/" className="s-logo" aria-label="Sobbra, página inicial">sobbra<i>.</i></Link>
          <nav aria-label="Seções" className="s-links"><a href="#dia">Como ajuda</a><a href="#futuro">Seu futuro</a><a href="#recursos">Recursos</a><a href="#planos">Planos</a><a href="#duvidas">Dúvidas</a></nav>
          <div className="s-nav-cta">{logged ? <Link className="s-btn s-btn-sun s-btn-sm" href="/inicio">Abrir o app</Link> : <><Link className="s-btn s-btn-ghost s-btn-sm" href="/entrar">Entrar</Link><Link className="s-btn s-btn-sun s-btn-sm" href="/cadastro">Começar grátis</Link></>}</div>
        </div>
      </header>

      <main id="conteudo">
        {sp.excluida && <div className="s-wrap s-note" role="status">Sua conta e todos os seus dados foram excluídos.</div>}
        <section className="s-hero s-hero2">
          <div className="s-mesh" aria-hidden />
          <div className="s-wrap s-hero-copy s-center-copy">
            <span className="s-chip s-in1"><span className="s-dot" /> Controle financeiro com IA para você e sua família</span>
            <h1 className="s-in2">Organize o hoje.<br />Construa o <em>futuro</em> de quem você ama.</h1>
            <p className="s-lead s-in3">O Sobbra anota seus gastos por voz e por foto, mostra quanto ainda sobra no mês e transforma o que sobra em metas: a reserva de emergência, a faculdade dos filhos, a casa própria.</p>
            <div className="s-ctas s-in4"><Link className="s-btn s-btn-sun s-btn-lg" href={cta.href}>{cta.label} <span aria-hidden>→</span></Link><a className="s-btn s-btn-glass s-btn-lg" href="#dia">Ver como ajuda no dia a dia</a></div>
            <ul className="s-trust s-in5"><li>Grátis para começar</li><li>Sem cartão de crédito</li><li>Não pede senha do banco</li><li>Cancele em 2 toques</li></ul>
          </div>
          <div className="s-wrap s-stage2">
            <AppMock />
            <div className="s-phone s-phone-sm" aria-hidden><div className="s-notch" /><div className="s-screen">
              <p className="s-ph-eyebrow">Fale com o Sobbra</p>
              <div className="s-voice"><span className="s-mic">🎙️</span><Typed phrases={["Gastei 42 no mercado no débito", "Recebi 4.800 de salário", "Guardei 350 para a faculdade"]} /></div>
              <ul className="s-ph-list">
                <li style={{ ["--d" as string]: "1.4s" }}><span>🛒</span><b>Mercado</b><em>− R$ 42,00</em></li>
                <li style={{ ["--d" as string]: "1.7s" }}><span>💼</span><b>Salário</b><em className="s-pos">+ R$ 4.800</em></li>
                <li style={{ ["--d" as string]: "2s" }}><span>🎓</span><b>Faculdade</b><em className="s-pos">62%</em></li>
              </ul></div></div>
            <div className="s-float s-float-b2"><b>✓ Lançado</b> em Mercado</div>
            <div className="s-float s-float-c2"><span>🔔</span><div><b>Conta de luz vence amanhã</b><small>R$ 187,00 · toque para pagar</small></div></div>
          </div>
          <div className="s-wrap s-fict">Imagens ilustrativas com valores fictícios.</div>
        </section>

        <div className="s-marquee" aria-label="O que o Sobbra faz"><div>{[...MARQUEE, ...MARQUEE].map((x, i) => <span key={i}>{x}</span>)}</div></div>

        <section className="s-sec">
          <div className="s-wrap">
            <p className="s-eyebrow" data-r>A verdade</p>
            <h2 className="s-h2" data-r>Não é falta de dinheiro. É falta de clareza.</h2>
            <div className="s-pains">
              {[["📉", "A planilha morre no dia 10", "Anotar tudo à mão cansa. Uma semana sem atualizar e ela já não serve para nada."], ["😬", "A fatura chega e assusta", "O problema não é gastar: é descobrir só no fim do mês quanto já foi."], ["🌙", "O futuro fica para depois", "Sem saber quanto sobra, guardar para a família vira sempre “mês que vem”."]].map(([i, t, d]) => (
                <div className="s-pain" key={t} data-r><span className="s-pain-i">{i}</span><h3>{t}</h3><p>{d}</p></div>
              ))}
            </div>
            <p className="s-turn" data-r>Com o Sobbra, você sabe <b>todos os dias</b> quanto pode gastar e quanto pode guardar.</p>
          </div>
        </section>

        <section id="dia" className="s-sec s-sec-alt">
          <div className="s-wrap">
            <p className="s-eyebrow" data-r>Um dia com o Sobbra</p>
            <h2 className="s-h2" data-r>Ele cabe na sua rotina. E muda o seu mês.</h2>
            <ol className="s-day">
              <span className="s-day-line" aria-hidden><i /></span>
              {DAY.map(([h, ic, t, d, chip]) => (
                <li key={h} className="s-day-i" data-r>
                  <span className="s-day-dot" aria-hidden>{ic}</span>
                  <div className="s-day-c"><span className="s-day-h">{h}</span><h3>{t}</h3><p>{d}</p><span className="s-day-chip">{chip}</span></div>
                </li>
              ))}
            </ol>
          </div>
        </section>

        <section id="futuro" className="s-sec s-dark s-future">
          <div className="s-mesh" aria-hidden />
          <div className="s-wrap">
            <p className="s-eyebrow s-eyebrow-sun" data-r>O futuro que você está construindo</p>
            <h2 className="s-h2" data-r>Cada real que sobra hoje vira um sonho realizado amanhã.</h2>
            <p className="s-lead" data-r>Crie metas para o que importa. O Sobbra calcula quanto guardar por mês e comemora com você cada conquista.</p>
            <div className="s-goals">{GOALS.map(([ic, t, p, sub, c], i) => (
              <div className="s-goal" key={t} data-r style={{ ["--c" as string]: c, ["--v" as string]: p, ["--i" as string]: i }}>
                <div className="s-ring"><svg viewBox="0 0 120 120"><circle cx="60" cy="60" r="50" /><circle className="s-ring-v" cx="60" cy="60" r="50" pathLength={100} /></svg><span>{ic}</span></div>
                <h3>{t}</h3><b>{p}%</b><small>{sub}</small>
              </div>))}</div>
            <p className="s-fict" style={{ textAlign: "left" }}>Exemplos ilustrativos.</p>
          </div>
        </section>

        <section className="s-sec">
          <div className="s-wrap s-split s-split-sim">
            <div data-r>
              <p className="s-eyebrow">Simulador</p>
              <h2 className="s-h2" style={{ marginBottom: 16 }}>Quanto a sua família pode juntar?</h2>
              <p className="s-lead s-muted" style={{ opacity: 1 }}>Arraste e veja: pouco por mês, com constância, vira muito. O Sobbra mostra quanto sobra para você guardar sem apertar o orçamento.</p>
              <Link className="s-btn s-btn-em s-btn-lg" href={cta.href} style={{ marginTop: 26 }}>Quero começar a guardar <span aria-hidden>→</span></Link>
            </div>
            <div data-r><Simulator /></div>
          </div>
        </section>

        <section className="s-sec s-sec-alt">
          <div className="s-wrap">
            <p className="s-eyebrow s-center" data-r>Antes e depois</p>
            <h2 className="s-h2 s-center" data-r>A diferença aparece no primeiro mês.</h2>
            <div className="s-vs">
              <div className="s-vs-c s-vs-no" data-r><h3>Sem o Sobbra</h3><ul>{["Descobre o tamanho da fatura quando ela chega", "Conta vence e você paga juros", "Guarda o que sobra… quando sobra", "Discussões sobre dinheiro em casa", "O futuro dos filhos fica para depois"].map((x) => <li key={x}>{x}</li>)}</ul></div>
              <div className="s-vs-c s-vs-yes" data-r><h3>Com o Sobbra</h3><ul>{["Sabe hoje quanto ainda pode gastar no mês", "Recebe o aviso antes de vencer", "Guarda primeiro, com metas e valor por mês", "Todo mundo vê os mesmos números", "Cada mês, um passo mais perto dos sonhos"].map((x) => <li key={x}>{x}</li>)}</ul></div>
            </div>
          </div>
        </section>

        <section id="recursos" className="s-sec">
          <div className="s-wrap">
            <p className="s-eyebrow" data-r>Recursos</p>
            <h2 className="s-h2" data-r>Tudo o que você precisa para o dinheiro render.</h2>
            <div className="s-bento">{FEATS.map(([i, t, d, c]) => <article key={t} className={`s-feat ${c}`} data-r><span className="s-feat-i" aria-hidden>{i}</span><h3>{t}</h3><p>{d}</p></article>)}</div>
          </div>
        </section>

        <section className="s-sec s-family">
          <div className="s-wrap s-split">
            <div data-r>
              <p className="s-eyebrow">Plano Família</p>
              <h2 className="s-h2">Dinheiro é assunto de família. Agora, sem briga.</h2>
              <p className="s-lead s-muted" style={{ opacity: 1 }}>Até 5 pessoas na mesma conta, cada uma no seu celular. Contas, orçamento e metas compartilhados, para todo mundo remar para o mesmo lado. E as crianças aprendem, vendo, que guardar vale a pena.</p>
            </div>
            <ul className="s-checks s-checks-light" data-r>
              <li><b>Contas da casa num lugar só.</b> Quem pagou, quanto falta, quando vence.</li>
              <li><b>Metas da família.</b> Viagem, reforma, faculdade: todos acompanham.</li>
              <li><b>Cada um no seu celular.</b> Registra por voz, foto ou nota fiscal.</li>
              <li><b>Conversa com números.</b> Menos achismo, mais decisão junto.</li>
            </ul>
          </div>
        </section>

        <section className="s-sec s-dark">
          <div className="s-wrap s-split">
            <div data-r>
              <p className="s-eyebrow s-eyebrow-sun">Segurança e privacidade</p>
              <h2 className="s-h2">Seu dinheiro. Seus dados. Suas regras.</h2>
              <p className="s-lead">Feito para quem quer organizar a vida financeira sem abrir mão da privacidade.</p>
            </div>
            <ul className="s-checks" data-r>
              <li><b>Sem senha de banco.</b> Você decide o que entra no app.</li>
              <li><b>Comprovantes criptografados.</b> Só você tem acesso.</li>
              <li><b>LGPD de verdade.</b> Exporte ou apague tudo quando quiser.</li>
              <li><b>Sem anúncios e sem venda de dados.</b> Quem paga é o assinante, não o anunciante.</li>
            </ul>
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
            <h2>O melhor momento para começar foi ontem.<br /><em>O segundo melhor é agora.</em></h2>
            <p>Crie sua conta em menos de um minuto e registre o primeiro gasto falando. Seu eu do futuro, e sua família, agradecem.</p>
            <Link className="s-btn s-btn-sun s-btn-lg" href={cta.href}>{cta.label} <span aria-hidden>→</span></Link>
            <ul className="s-trust" style={{ justifyContent: "center", marginTop: 18 }}><li>Grátis para começar</li><li>Sem cartão de crédito</li><li>Cancele quando quiser</li></ul>
          </div>
        </section>
      </main>

      <footer className="s-foot">
        <div className="s-wrap s-foot-in">
          <div><Link href="/" className="s-logo">sobbra<i>.</i></Link><p className="s-muted">Organize o hoje. Construa o futuro.</p></div>
          <nav aria-label="Rodapé" className="s-foot-links"><a href="#dia">Como ajuda</a><a href="#futuro">Seu futuro</a><a href="#planos">Planos</a><a href="#duvidas">Dúvidas</a><Link href="/entrar">Entrar</Link><Link href="/cadastro">Criar conta</Link></nav>
          <div className="s-by"><span>Site criado por</span><RedboxMark height={22} tone="dark" /></div>
        </div>
        <div className="s-wrap s-copy">© {new Date().getFullYear()} Sobbra. Todos os direitos reservados.</div>
      </footer>
    </div>
  );
}
