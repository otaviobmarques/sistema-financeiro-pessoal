import Link from "next/link";
import { requireUser, isAdmin } from "@/lib/auth";

export default async function Mais() {
  const user = await requireUser();
  const items = [
    ["/orcamentos", "🎯", "Orçamentos e metas", "Limites por categoria e metas"],
    ["/dividas", "🧯", "Minhas dívidas", "Plano para sair do vermelho"],
    ["/importar", "📥", "Importar extrato", "OFX ou CSV do banco e do cartão"],
    ["/nfce", "🧾", "Nota fiscal (NFC-e)", "QR Code do cupom com os itens"],
    ["/contas-a-pagar", "🧾", "Contas a pagar", "Boletos pela câmera e lembretes"],
    ["/agenda", "📅", "Agenda", "Compromissos, lembretes e contas a vencer"],
    ["/recorrentes", "🔁", "Fixas e recorrentes", "Aluguel, salário, assinaturas"],
    ["/relatorios/despesas", "🧾", "Relatório de despesas", "Por período, com PDF e imagem"],
    ["/relatorios", "📊", "Onde gasto mais", "Ranking e comparativos"],
    ["/contas", "💳", "Contas e cartões", "Saldos e faturas"],
    ["/lixeira", "🗑️", "Lixeira", "Recupere o que excluiu"],
    ["/ajustes", "⚙️", "Ajustes", "Aparência, plano, privacidade"],
    ...(isAdmin(user) ? [["/admin", "🛠️", "Backoffice", "Usuários, métricas e auditoria"]] : []),
  ];
  return (
    <div className="mx-auto max-w-md">
      <h1 className="mb-4 text-xl font-bold">Mais</h1>
      <ul className="card divide-y p-0">{items.map(([href, icon, title, sub]) => (
        <li key={href} style={{ borderColor: "var(--line)" }}><Link href={href} className="flex min-h-[64px] items-center gap-3 px-4"><span className="text-2xl">{icon}</span><span className="flex-1"><b className="block">{title}</b><span className="muted text-sm">{sub}</span></span><span className="muted">›</span></Link></li>
      ))}</ul>
    </div>
  );
}
