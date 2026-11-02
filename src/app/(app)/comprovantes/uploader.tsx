"use client";
import { useRef, useState } from "react";
import { useRouter } from "next/navigation";

export function Uploader() {
  const router = useRouter();
  const cam = useRef<HTMLInputElement>(null);
  const gal = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  const [msgs, setMsgs] = useState<string[]>([]);
  const [drag, setDrag] = useState(false);

  async function send(files: FileList | File[] | null) {
    if (!files || !files.length) return;
    setBusy(true);
    const fd = new FormData();
    for (const f of Array.from(files)) fd.append("files", f);
    const r = await fetch("/api/receipts/upload", { method: "POST", body: fd });
    const j = await r.json();
    setMsgs((j.results ?? []).filter((x: any) => x.status !== "na fila").map((x: any) => `${x.name}: ${x.status}`));
    setBusy(false);
    router.refresh();
  }

  return (
    <div onDragOver={(e) => { e.preventDefault(); setDrag(true); }} onDragLeave={() => setDrag(false)} onDrop={(e) => { e.preventDefault(); setDrag(false); send(e.dataTransfer.files); }}
      className={`card border-2 border-dashed ${drag ? "border-sobbra" : ""}`}>
      <div className="flex gap-3">
        <button className="btn-primary h-20 flex-1 flex-col" onClick={() => cam.current?.click()} disabled={busy}><span className="text-2xl">📷</span>Tirar foto</button>
        <button className="btn-ghost h-20 flex-1 flex-col" onClick={() => gal.current?.click()} disabled={busy}><span className="text-2xl">🖼️</span>Galeria ou PDF</button>
      </div>
      <input ref={cam} type="file" accept="image/*" capture="environment" hidden multiple onChange={(e) => send(e.target.files)} />
      <input ref={gal} type="file" accept="image/*,application/pdf" hidden multiple onChange={(e) => send(e.target.files)} />
      <p className="muted mt-3 hidden text-center text-sm md:block">ou arraste os arquivos para cá</p>
      {busy && <p className="mt-3 text-center text-sm">Enviando…</p>}
      {msgs.map((m) => <p key={m} className="mt-2 text-sm text-ambar">{m}</p>)}
    </div>
  );
}
