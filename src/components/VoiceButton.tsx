"use client";
// Agente de voz (M17). Reconhecimento de fala pt-BR no proprio navegador (Web Speech API):
// gratis, sem enviar audio para o servidor — o audio nunca e armazenado (RNF-16).
import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { deleteTransactions } from "@/app/actions";

type Pending = { item: any; ask: string } | null;
type Turn = { who: "voce" | "sobbra"; text: string };

export function VoiceButton({ variant = "fab" }: { variant?: "fab" | "big" | "none" }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [listening, setListening] = useState(false);
  const [interim, setInterim] = useState("");
  const [turns, setTurns] = useState<Turn[]>([]);
  const [pending, setPending] = useState<Pending>(null);
  const [undo, setUndo] = useState<{ ids: string[]; left: number } | null>(null);
  const [typed, setTyped] = useState("");
  const [busy, setBusy] = useState(false);
  const [speak, setSpeak] = useState(false);
  const recRef = useRef<any>(null);
  const supported = typeof window !== "undefined" && ("webkitSpeechRecognition" in window || "SpeechRecognition" in window);

  useEffect(() => { try { setSpeak(localStorage.getItem("sobbra-voice-reply") === "1"); } catch {} }, []);
  // Atalho do PWA "Falar com o Sobbra" (RF-170)
  useEffect(() => { if (variant !== "big" && new URLSearchParams(location.search).get("falar") === "1") setOpen(true); }, [variant]);
  useEffect(() => { if (variant === "big") return; const o = () => setOpen(true); addEventListener("sobbra:voz", o); return () => removeEventListener("sobbra:voz", o); }, [variant]);
  useEffect(() => {
    if (!undo) return;
    if (undo.left <= 0) { setUndo(null); return; }
    const t = setTimeout(() => setUndo((u) => u && { ...u, left: u.left - 1 }), 1000);
    return () => clearTimeout(t);
  }, [undo]);

  const send = useCallback(async (text: string) => {
    if (!text.trim()) return;
    setTurns((t) => [...t, { who: "voce", text }]);
    setBusy(true);
    try {
      const r = await fetch("/api/voice", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ text, pending }) });
      const j = await r.json();
      setTurns((t) => [...t, { who: "sobbra", text: j.say ?? j.error ?? "Algo deu errado." }]);
      setPending(j.pending ?? null);
      if (j.ids?.length) setUndo({ ids: j.ids, left: 10 });
      if (j.changed) router.refresh();
      if (speak && j.say && "speechSynthesis" in window) {
        const u = new SpeechSynthesisUtterance(j.say); u.lang = "pt-BR"; speechSynthesis.speak(u);
      }
      if (navigator.vibrate && j.ids?.length) navigator.vibrate(30);
    } finally { setBusy(false); }
  }, [pending, router, speak]);

  const start = () => {
    setOpen(true);
    if (!supported) return;
    const SR = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    const rec = new SR();
    rec.lang = "pt-BR"; rec.interimResults = true; rec.maxAlternatives = 1; rec.continuous = false;
    rec.onresult = (e: any) => {
      let fin = "", tmp = "";
      for (const r of e.results) (r.isFinal ? (fin += r[0].transcript) : (tmp += r[0].transcript));
      setInterim(tmp || fin);
      if (fin) { setInterim(""); send(fin); }
    };
    rec.onend = () => setListening(false);
    rec.onerror = () => setListening(false);
    recRef.current = rec;
    rec.start(); setListening(true);
  };
  const stop = () => { recRef.current?.stop(); setListening(false); };

  const trigger = variant === "none" ? null : variant === "big" ? (
    <button onClick={start} className="btn-ghost h-14 w-full">Por voz <span aria-hidden>🎙</span></button>
  ) : (
    <button onClick={start} aria-label="Falar com o Sobbra" className="fixed bottom-20 right-4 z-40 grid h-16 w-16 place-items-center rounded-full bg-sobbra text-3xl text-white shadow-xl active:scale-95 md:bottom-6 md:right-6">🎙️</button>
  );

  return (
    <>
      {trigger}
      {open && (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 md:items-center" onClick={() => { stop(); setOpen(false); }}>
          <div className="card fill-in w-full max-w-lg rounded-b-none md:rounded-2xl" onClick={(e) => e.stopPropagation()}>
            <div className="mb-3 flex items-center justify-between">
              <h2 className="text-lg font-bold">Falar com o Sobbra</h2>
              <button className="muted px-2 text-2xl" aria-label="Fechar" onClick={() => { stop(); setOpen(false); }}>×</button>
            </div>
            <div className="mb-3 max-h-72 space-y-2 overflow-y-auto">
              {turns.length === 0 && <p className="muted text-sm">Experimente: “Lançar gasolina 50”, “paguei 120 no mercado no cartão”, “recebi 1.200 do freela” ou “quanto ainda posso gastar?”.</p>}
              {turns.map((t, i) => (
                <div key={i} className={`fill-in rounded-2xl px-3 py-2 text-sm ${t.who === "voce" ? "ml-10 bg-forest text-white" : "soft mr-10"}`}>{t.text}</div>
              ))}
              {interim && <div className="ml-10 rounded-2xl bg-floresta/60 px-3 py-2 text-sm italic text-white">{interim}…</div>}
              {busy && <div className="soft mr-10 w-16 animate-pulse rounded-2xl px-3 py-2 text-sm">…</div>}
            </div>
            {undo && (
              <button className="btn-ghost mb-3 w-full" onClick={async () => { await deleteTransactions(undo.ids); setUndo(null); setTurns((t) => [...t, { who: "sobbra", text: "Desfeito. Nada foi lançado." }]); router.refresh(); }}>
                ↩️ Desfazer ({undo.left}s)
              </button>
            )}
            <div className="flex items-center gap-3">
              {supported ? (
                <button onClick={listening ? stop : start} className={`grid h-16 w-16 shrink-0 place-items-center rounded-full text-3xl text-white ${listening ? "listening bg-terracotta" : "bg-forest"}`} aria-label={listening ? "Parar" : "Falar"}>
                  {listening ? "■" : "🎙️"}
                </button>
              ) : null}
              <form className="flex flex-1 gap-2" onSubmit={(e) => { e.preventDefault(); send(typed); setTyped(""); }}>
                <input className="input" value={typed} onChange={(e) => setTyped(e.target.value)} placeholder={supported ? "ou digite aqui" : "Digite o que gastou"} aria-label="Comando" />
                <button className="btn-dark" disabled={busy}>Enviar</button>
              </form>
            </div>
            <label className="muted mt-3 flex items-center gap-2 text-xs">
              <input type="checkbox" checked={speak} onChange={(e) => { setSpeak(e.target.checked); try { localStorage.setItem("sobbra-voice-reply", e.target.checked ? "1" : "0"); } catch {} }} />
              Responder em voz alta
            </label>
          </div>
        </div>
      )}
    </>
  );
}
