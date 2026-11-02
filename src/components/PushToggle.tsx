"use client";
// Liga as notificacoes push deste aparelho (PWA). No iPhone exige o app instalado na tela de inicio.
import { useEffect, useState } from "react";

const b64ToBytes = (b64: string) => { const s = atob((b64 + "=".repeat((4 - (b64.length % 4)) % 4)).replace(/-/g, "+").replace(/_/g, "/")); return Uint8Array.from(s, (c) => c.charCodeAt(0)); };

export function PushToggle() {
  const [state, setState] = useState<"loading" | "unsupported" | "off" | "on" | "denied" | "nokey">("loading");
  const [msg, setMsg] = useState<string>();
  useEffect(() => {
    (async () => {
      if (!("serviceWorker" in navigator) || !("PushManager" in window)) return setState("unsupported");
      if (Notification.permission === "denied") return setState("denied");
      const reg = await navigator.serviceWorker.ready; const sub = await reg.pushManager.getSubscription();
      setState(sub ? "on" : "off");
    })().catch(() => setState("unsupported"));
  }, []);
  async function enable() {
    setMsg(undefined);
    const { publicKey } = await (await fetch("/api/push")).json();
    if (!publicKey) return setState("nokey");
    const perm = await Notification.requestPermission();
    if (perm !== "granted") return setState("denied");
    const reg = await navigator.serviceWorker.ready;
    const sub = await reg.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: b64ToBytes(publicKey) });
    const r = await fetch("/api/push?teste=1", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(sub) });
    if (r.ok) { setState("on"); setMsg("Pronto! Mandamos um aviso de teste."); } else setMsg("Não consegui ligar agora. Tente de novo.");
  }
  async function disable() {
    const reg = await navigator.serviceWorker.ready; const sub = await reg.pushManager.getSubscription();
    if (sub) { await fetch("/api/push", { method: "DELETE", headers: { "content-type": "application/json" }, body: JSON.stringify({ endpoint: sub.endpoint }) }); await sub.unsubscribe(); }
    setState("off");
  }
  const text = { loading: "Verificando…", unsupported: "Este navegador não recebe notificações. No iPhone, instale o Sobbra na tela de início (Compartilhar → Adicionar à Tela de Início) e abra por lá.", denied: "As notificações estão bloqueadas para o Sobbra nas configurações do navegador.", nokey: "O servidor ainda não tem as chaves de notificação configuradas (VAPID).", off: "Receba os avisos mesmo com o app fechado.", on: "Notificações ligadas neste aparelho." }[state];
  return (
    <div className="flex flex-wrap items-center gap-3">
      <p className="muted flex-1 text-sm">{text}{msg && <span className="block text-sobbra">{msg}</span>}</p>
      {state === "off" && <button type="button" className="btn-primary" onClick={enable}>Ligar notificações</button>}
      {state === "on" && <button type="button" className="btn-ghost" onClick={disable}>Desligar neste aparelho</button>}
    </div>
  );
}
