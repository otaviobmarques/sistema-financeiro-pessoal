"use client";
import { useEffect, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { readNfce } from "@/app/actions-f2";

function QrScanner({ onCode, onClose }: { onCode: (c: string) => void; onClose: () => void }) {
  const video = useRef<HTMLVideoElement>(null);
  const [msg, setMsg] = useState("Aponte para o QR Code no rodapé do cupom.");
  useEffect(() => {
    let stream: MediaStream | null = null, alive = true;
    (async () => {
      const BD = (window as any).BarcodeDetector;
      if (!BD) { setMsg("Este navegador não lê QR Code pela câmera. Use a câmera do celular, toque no link e cole aqui, ou digite a chave."); return; }
      try {
        stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: "environment" } });
        video.current!.srcObject = stream; await video.current!.play();
        const det = new BD({ formats: ["qr_code"] });
        while (alive) {
          const codes = await det.detect(video.current!).catch(() => []);
          if (codes[0]?.rawValue) { if (navigator.vibrate) navigator.vibrate(40); onCode(codes[0].rawValue); return; }
          await new Promise((r) => setTimeout(r, 250));
        }
      } catch { setMsg("Não consegui abrir a câmera. Libere o acesso ou cole o link do QR Code."); }
    })();
    return () => { alive = false; stream?.getTracks().forEach((t) => t.stop()); };
  }, [onCode]);
  return (
    <div className="fixed inset-0 z-50 flex flex-col items-center justify-center gap-3 bg-black/85 p-4 text-white">
      <div className="relative aspect-square w-full max-w-sm overflow-hidden rounded-2xl scanner"><video ref={video} playsInline muted className="h-full w-full object-cover" /></div>
      <p className="max-w-sm text-center text-sm">{msg}</p>
      <button className="btn bg-white/15 text-white" onClick={onClose}>Fechar</button>
    </div>
  );
}

export function NfceReader() {
  const router = useRouter();
  const [v, setV] = useState("");
  const [err, setErr] = useState<string>();
  const [scan, setScan] = useState(false);
  const [pending, start] = useTransition();
  const go = (input: string) => start(async () => { setErr(undefined); const r = await readNfce(input); if (r.error) setErr(r.error); else router.push(`/nfce/${r.id}`); });
  return (
    <div className="card space-y-3">
      <div className="flex flex-wrap gap-2">
        <button className="btn-primary" onClick={() => setScan(true)}>📷 Ler QR Code</button>
        <input className="input min-w-[220px] flex-1" value={v} onChange={(e) => setV(e.target.value)} placeholder="ou cole o link do QR Code / a chave de acesso" aria-label="Link ou chave da NFC-e" />
        <button className="btn-dark" disabled={pending || !v.trim()} onClick={() => go(v)}>{pending ? "Buscando…" : "Buscar"}</button>
      </div>
      {pending && <p className="muted text-sm">Consultando a nota na SEFAZ do seu estado…</p>}
      {err && <p className="text-sm text-coral">{err}</p>}
      {scan && <QrScanner onClose={() => setScan(false)} onCode={(c) => { setScan(false); setV(c); go(c); }} />}
    </div>
  );
}
