// Creditos: sistema desenvolvido pela Domma Tecnologia; design pela agencia REDBOX.
// Para usar os logos oficiais, coloque os arquivos em public/creditos/ (domma.svg|png, redbox.svg|png) e troque aqui.
export function DommaMark({ size = 17 }: { size?: number }) {
  return (
    <span className="inline-flex items-center gap-1.5" aria-label="Domma Tecnologia">
      <svg width={size * 1.6} height={size} viewBox="0 0 26 16" aria-hidden><circle cx="10" cy="3" r="2.2" fill="currentColor" /><path d="M2 12c3-6 5-6 7 0s5 6 8 0 5-6 7 0" fill="none" stroke="#7C6CF2" strokeWidth="2.6" strokeLinecap="round" /></svg>
      <span className="leading-none"><b style={{ fontSize: size }} className="block">Domma</b><span className="block text-[8px] font-bold tracking-[.28em]" style={{ color: "#7C6CF2" }}>TECNOLOGIA</span></span>
    </span>
  );
}
export function RedboxMark({ size = 19 }: { size?: number }) {
  return <span aria-label="REDBOX" style={{ fontFamily: 'Impact, "Arial Black", Arial, sans-serif', fontWeight: 900, fontSize: size, letterSpacing: ".02em" }}><span style={{ color: "#FF2D35" }}>RED</span><span className="text-[#0A0A0A] dark:text-white">BOX</span></span>;
}

export function Credits({ compact = false }: { compact?: boolean }) {
  if (compact) return (
    <div className="space-y-1.5 text-xs">
      <div><span className="muted block">Desenvolvido por</span><DommaMark size={15} /></div>
      <div><span className="muted block">Design por</span><RedboxMark size={16} /></div>
    </div>
  );
  return (
    <div className="flex flex-wrap items-center justify-center gap-x-8 gap-y-3 text-sm">
      <span className="inline-flex items-center gap-2"><span className="muted">Sistema desenvolvido por</span><DommaMark /></span>
      <span className="inline-flex items-center gap-2"><span className="muted">Design por</span><RedboxMark /></span>
    </div>
  );
}
