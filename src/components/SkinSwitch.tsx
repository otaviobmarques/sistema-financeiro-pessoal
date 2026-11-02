"use client";
import { useEffect, useState } from "react";

type Skin = "vibe" | "sutil";
const readPrefs = () => { try { return JSON.parse(localStorage.getItem("sobbra-prefs") || "{}"); } catch { return {}; } };

/** Troca o estilo de cores (Vibrante ou Sutil). Fica salvo neste aparelho, junto das outras preferencias de aparencia. */
export function SkinSwitch() {
  const [skin, setSkin] = useState<Skin>("vibe");
  useEffect(() => { setSkin(document.documentElement.dataset.skin === "sutil" ? "sutil" : "vibe"); }, []);
  const set = (s: Skin) => {
    setSkin(s); document.documentElement.dataset.skin = s;
    try { localStorage.setItem("sobbra-prefs", JSON.stringify({ ...readPrefs(), skin: s })); } catch {}
  };
  return (
    <div className="skinsw" role="group" aria-label="Estilo de cores">
      <button type="button" aria-pressed={skin === "vibe"} onClick={() => set("vibe")}>Vibrante</button>
      <button type="button" aria-pressed={skin === "sutil"} onClick={() => set("sutil")}>Sutil</button>
    </div>
  );
}
