"use client";
// "Registrar": acao global de entrada. Abre as formas de registrar, todas com revisao antes de gravar.
import { useEffect, useRef, useState } from "react";
import Link from "next/link";

const OPTIONS = [
  { href: "/lancamentos/novo", title: "Digitar", desc: "Entrada, saída ou transferência" },
  { voice: true, title: "Por voz", desc: "Diga, por exemplo: gastei 30 no mercado" },
  { href: "/comprovantes", title: "Foto do comprovante", desc: "Você confere os campos antes de salvar" },
  { href: "/nfce", title: "Nota fiscal (QR Code)", desc: "Traz os itens da compra" },
  { href: "/contas-a-pagar", title: "Boleto ou conta a pagar", desc: "Lê a linha digitável" },
  { href: "/importar", title: "Importar extrato", desc: "Arquivo OFX ou CSV do banco" },
] as const;

export function RegisterButton({ block = false }: { block?: boolean }) {
  const [open, setOpen] = useState(false);
  const panel = useRef<HTMLDivElement>(null);
  const trigger = useRef<HTMLButtonElement>(null);
  useEffect(() => {
    if (!open) return;
    panel.current?.querySelector<HTMLElement>("a,button")?.focus();
    const esc = (e: KeyboardEvent) => { if (e.key === "Escape") { setOpen(false); trigger.current?.focus(); } };
    addEventListener("keydown", esc); return () => removeEventListener("keydown", esc);
  }, [open]);
  return (
    <>
      <button ref={trigger} onClick={() => setOpen(true)} aria-haspopup="dialog" className={block ? "btn-primary w-full justify-between" : "btn-primary h-14 rounded-full px-6 shadow-lg"}>
        Registrar <span aria-hidden className="text-xl leading-none">+</span>
      </button>
      {open && (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 md:items-center" onClick={() => setOpen(false)}>
          <div ref={panel} role="dialog" aria-modal="true" aria-labelledby="reg-title" className="card fill-in w-full max-w-md rounded-b-none md:rounded-2xl" onClick={(e) => e.stopPropagation()}>
            <div className="mb-2 flex items-center justify-between"><h2 id="reg-title" className="h1 text-2xl">Registrar</h2><button className="btn-ghost min-h-[44px] px-3" onClick={() => setOpen(false)} aria-label="Fechar">✕</button></div>
            <ul className="divide-y" style={{ borderColor: "var(--line)" }}>
              {OPTIONS.map((o) => (
                <li key={o.title} style={{ borderColor: "var(--line)" }}>
                  {"voice" in o ? (
                    <button className="flex min-h-[60px] w-full items-center justify-between gap-3 py-2 text-left" onClick={() => { setOpen(false); window.dispatchEvent(new Event("sobbra:voz")); }}><span><b className="block">{o.title}</b><span className="muted text-sm">{o.desc}</span></span><span aria-hidden>›</span></button>
                  ) : (
                    <Link href={o.href} onClick={() => setOpen(false)} className="flex min-h-[60px] items-center justify-between gap-3 py-2"><span><b className="block">{o.title}</b><span className="muted text-sm">{o.desc}</span></span><span aria-hidden>›</span></Link>
                  )}
                </li>
              ))}
            </ul>
          </div>
        </div>
      )}
    </>
  );
}
