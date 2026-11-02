// Creditos com os logotipos oficiais (public/brand).
// Sistema (app, login, backoffice): Domma Tecnologia. Site institucional: REDBOX.
type Tone = "auto" | "light" | "dark";

/** tone="light" para fundo claro, "dark" para fundo escuro, "auto" segue o tema do app. */
export function DommaMark({ height = 28, tone = "auto" }: { height?: number; tone?: Tone }) {
  const w = Math.round(height * 5);
  const img = (src: string, cls = "") => <img src={src} alt="Domma Tecnologia" width={w} height={height} className={cls} style={{ height, width: "auto" }} loading="lazy" decoding="async" />;
  if (tone === "light") return img("/brand/domma-light.png");
  if (tone === "dark") return img("/brand/domma-dark.png");
  return <>{img("/brand/domma-light.png", "dark:hidden")}{img("/brand/domma-dark.png", "hidden dark:inline")}</>;
}

export function RedboxMark({ height = 22, tone = "auto" }: { height?: number; tone?: Tone }) {
  const w = Math.round(height * 3.5);
  const img = (src: string, cls = "") => <img src={src} alt="REDBOX" width={w} height={height} className={cls} style={{ height, width: "auto" }} loading="lazy" decoding="async" />;
  if (tone === "light") return img("/brand/redbox-light.png");
  if (tone === "dark") return img("/brand/redbox-dark.png");
  return <>{img("/brand/redbox-light.png", "dark:hidden")}{img("/brand/redbox-dark.png", "hidden dark:inline")}</>;
}

/** Credito do sistema: "Sistema desenvolvido pela Domma Tecnologia". */
export function Credits({ compact = false }: { compact?: boolean }) {
  if (compact) return (
    <div className="text-xs"><span className="muted mb-1 block">Sistema desenvolvido pela</span><DommaMark height={24} /></div>
  );
  return (
    <div className="flex flex-col items-center gap-2 text-sm"><span className="muted">Sistema desenvolvido pela</span><DommaMark height={30} /></div>
  );
}
