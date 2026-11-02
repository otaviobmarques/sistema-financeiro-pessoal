"use client";
// Gera o relatorio como uma folha (canvas): vira PNG ou PDF em paginas A4.
import { useState } from "react";
import type { Report } from "@/lib/report";

const brl = (c: number) => (c / 100).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
const d = (s: string) => new Date(s).toLocaleDateString("pt-BR");

function roundRect(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) {
  ctx.beginPath(); ctx.moveTo(x + r, y); ctx.arcTo(x + w, y, x + w, y + h, r); ctx.arcTo(x + w, y + h, x, y + h, r); ctx.arcTo(x, y + h, x, y, r); ctx.arcTo(x, y, x + w, y, r); ctx.closePath();
}
function clip(ctx: CanvasRenderingContext2D, s: string, w: number) { if (ctx.measureText(s).width <= w) return s; while (s.length > 1 && ctx.measureText(s + "…").width > w) s = s.slice(0, -1); return s + "…"; }

function draw(r: Report, groupLabel: string) {
  const W = 1240, P = 70, MAXI = 80;
  const cv = document.createElement("canvas"); const ctx = cv.getContext("2d")!;
  cv.width = W; cv.height = 900 + r.rows.length * 46 + r.biggest.length * 44 + Math.min(r.items.length, MAXI) * 34;
  const F = (w: number, s: number) => `${w} ${s}px Inter, Verdana, sans-serif`; const D = (s: number) => `700 ${s}px Poppins, Inter, sans-serif`;
  ctx.fillStyle = "#fff"; ctx.fillRect(0, 0, W, cv.height);
  const g = ctx.createLinearGradient(0, 0, W, 220); g.addColorStop(0, "#0D5A42"); g.addColorStop(1, "#073326"); ctx.fillStyle = g; ctx.fillRect(0, 0, W, 220);
  ctx.fillStyle = "#FFB020"; ctx.beginPath(); ctx.arc(W - P - 30, 80, 30, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = "#fff"; ctx.font = D(44); ctx.fillText("sobbra", P, 92); ctx.fillStyle = "#FFB020"; ctx.fillText(".", P + ctx.measureText("sobbra").width, 92);
  ctx.fillStyle = "#D9EFE5"; ctx.font = F(500, 26); ctx.fillText(`Relatório de despesas · ${r.title}`, P, 145);
  ctx.font = F(400, 22); ctx.fillText(`${d(r.from)} a ${d(r.to)} · gerado em ${new Date().toLocaleDateString("pt-BR")}`, P, 182);
  let y = 270; const kw = (W - 2 * P - 60) / 4;
  ([["Total gasto", brl(r.total)], ["Média por dia", brl(r.perDay)], ["Fixos e parcelas", brl(r.fixed)], ["Lançamentos", String(r.items.length)]] as const).forEach(([l, v], i) => {
    const x = P + i * (kw + 20); ctx.fillStyle = "#EEF5F1"; roundRect(ctx, x, y, kw, 110, 18); ctx.fill();
    ctx.fillStyle = "#587069"; ctx.font = F(600, 17); ctx.fillText(l.toUpperCase(), x + 20, y + 38); ctx.fillStyle = i === 0 ? "#C93A3F" : "#17231F"; ctx.font = D(30); ctx.fillText(v, x + 20, y + 84);
  });
  y += 170; ctx.fillStyle = "#17231F"; ctx.font = D(28); ctx.fillText(`Por ${groupLabel.toLowerCase()}`, P, y); y += 30;
  const max = Math.max(...r.rows.map((x) => x.total), 1);
  for (const x of r.rows) {
    y += 46; ctx.fillStyle = "#17231F"; ctx.font = F(500, 21); ctx.fillText(clip(ctx, x.name.replace(/[\p{Extended_Pictographic}️‍]/gu, "").trim(), 330), P, y - 12);
    ctx.fillStyle = "#EDF4F0"; roundRect(ctx, P + 350, y - 32, 560, 22, 11); ctx.fill(); ctx.fillStyle = x.color; roundRect(ctx, P + 350, y - 32, Math.max(8, 560 * (x.total / max)), 22, 11); ctx.fill();
    ctx.fillStyle = "#587069"; ctx.font = F(400, 19); ctx.fillText(`${Math.round(x.pct * 100)}%`, P + 925, y - 14);
    ctx.fillStyle = "#17231F"; ctx.font = F(600, 21); ctx.textAlign = "right"; ctx.fillText(brl(x.total), W - P, y - 12); ctx.textAlign = "left";
  }
  y += 70; ctx.font = D(28); ctx.fillText("Maiores despesas", P, y); y += 14;
  for (const t of r.biggest) {
    y += 44; ctx.font = F(500, 21); ctx.fillStyle = "#17231F"; ctx.fillText(clip(ctx, t.description, 600), P, y);
    ctx.fillStyle = "#587069"; ctx.font = F(400, 18); ctx.fillText(clip(ctx, `${d(t.date)} · ${t.category}`, 360), P + 620, y);
    ctx.textAlign = "right"; ctx.fillStyle = "#17231F"; ctx.font = F(600, 21); ctx.fillText(brl(t.amountCents), W - P, y); ctx.textAlign = "left";
  }
  y += 70; ctx.font = D(28); ctx.fillStyle = "#17231F"; ctx.fillText(`Lançamentos${r.items.length > MAXI ? ` (${MAXI} mais recentes)` : ""}`, P, y); y += 50;
  ctx.font = F(600, 16); ctx.fillStyle = "#587069"; ["DATA", "DESCRIÇÃO", "CATEGORIA", "CONTA"].forEach((h, i) => ctx.fillText(h, P + [0, 150, 560, 850][i], y)); ctx.textAlign = "right"; ctx.fillText("VALOR", W - P, y); ctx.textAlign = "left";
  r.items.slice(0, MAXI).forEach((t, i) => {
    y += 34; if (i % 2 === 0) { ctx.fillStyle = "#F5F9F7"; ctx.fillRect(P - 10, y - 24, W - 2 * P + 20, 34); }
    ctx.fillStyle = "#17231F"; ctx.font = F(400, 18); ctx.fillText(d(t.date), P, y); ctx.fillText(clip(ctx, t.description, 390), P + 150, y); ctx.fillText(clip(ctx, t.category, 270), P + 560, y); ctx.fillText(clip(ctx, t.account, 160), P + 850, y);
    ctx.textAlign = "right"; ctx.fillText(brl(t.amountCents), W - P, y); ctx.textAlign = "left";
  });
  y += 60; ctx.fillStyle = "#587069"; ctx.font = F(400, 16); ctx.fillText("Sobbra · faça o seu dinheiro sobrar · relatório informativo, não substitui orientação profissional", P, y);
  const out = document.createElement("canvas"); out.width = W; out.height = y + 40; out.getContext("2d")!.drawImage(cv, 0, 0); return out;
}

function save(blob: Blob, name: string) {
  const url = URL.createObjectURL(blob); const a = document.createElement("a"); a.href = url; a.download = name; document.body.appendChild(a); a.click(); a.remove(); setTimeout(() => URL.revokeObjectURL(url), 2000);
}

export function ReportDownload({ report, groupLabel }: { report: Report; groupLabel: string }) {
  const [busy, setBusy] = useState<"pdf" | "png" | null>(null);
  const name = `sobbra-despesas-${report.from.slice(0, 10)}-a-${report.to.slice(0, 10)}`;
  async function run(kind: "pdf" | "png") {
    setBusy(kind);
    try {
      await document.fonts?.ready;
      const cv = draw(report, groupLabel);
      if (kind === "png") { const blob = await new Promise<Blob>((res) => cv.toBlob((b) => res(b!), "image/png")); save(blob, name + ".png"); return; }
      const { jsPDF } = await import("jspdf");
      const pdf = new jsPDF({ unit: "pt", format: "a4" }); const pw = pdf.internal.pageSize.getWidth(), ph = pdf.internal.pageSize.getHeight();
      const scale = pw / cv.width, pageH = Math.floor(ph / scale);
      for (let y = 0, i = 0; y < cv.height; y += pageH, i++) {
        const part = document.createElement("canvas"); part.width = cv.width; part.height = Math.min(pageH, cv.height - y);
        const c = part.getContext("2d")!; c.fillStyle = "#fff"; c.fillRect(0, 0, part.width, part.height); c.drawImage(cv, 0, -y);
        if (i) pdf.addPage(); pdf.addImage(part.toDataURL("image/jpeg", 0.92), "JPEG", 0, 0, pw, part.height * scale);
      }
      save(pdf.output("blob"), name + ".pdf");
    } finally { setBusy(null); }
  }
  return (
    <div className="flex gap-2">
      <button className="btn-dark" disabled={!!busy} onClick={() => run("pdf")}>{busy === "pdf" ? "Gerando…" : "Baixar PDF"}</button>
      <button className="btn-ghost" disabled={!!busy} onClick={() => run("png")}>{busy === "png" ? "Gerando…" : "Baixar imagem"}</button>
    </div>
  );
}
