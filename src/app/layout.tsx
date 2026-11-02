import "./globals.css";
import type { Metadata, Viewport } from "next";

export const metadata: Metadata = {
  title: "Sobbra — faça o seu dinheiro sobrar",
  description: "Você só tira a foto. O Sobbra anota, organiza e te avisa antes de o dinheiro acabar.",
  manifest: "/manifest.webmanifest",
  icons: { icon: "/icons/icon.svg", apple: "/icons/icon-192.png" },
  appleWebApp: { capable: true, title: "Sobbra", statusBarStyle: "default" },
};
export const viewport: Viewport = { themeColor: [{ media: "(prefers-color-scheme: light)", color: "#F6FAF8" }, { media: "(prefers-color-scheme: dark)", color: "#0E1A17" }], width: "device-width", initialScale: 1 };

// Aplica tema/preferencias antes da pintura para evitar flash (tema escuro obrigatorio, secao 3.4)
const boot = `try{var p=JSON.parse(localStorage.getItem('sobbra-prefs')||'{}');var t=p.theme||'system';var d=t==='dark'||(t==='system'&&matchMedia('(prefers-color-scheme: dark)').matches);var c=document.documentElement.classList;if(d)c.add('dark');if(p.size)document.documentElement.style.fontSize=p.size+'%';if(p.contrast)c.add('contrast');if(p.noMotion)c.add('no-motion');}catch(e){}
if('serviceWorker' in navigator){addEventListener('load',function(){navigator.serviceWorker.register('/sw.js')})}`;

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="pt-BR" suppressHydrationWarning>
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&family=Poppins:wght@700&display=swap" rel="stylesheet" />
        <script dangerouslySetInnerHTML={{ __html: boot }} />
      </head>
      <body className="min-h-screen font-sans antialiased">{children}</body>
    </html>
  );
}
