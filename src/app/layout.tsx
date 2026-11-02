import "./globals.css";
import type { Metadata, Viewport } from "next";
import { jakarta } from "./fonts";

const SITE = process.env.APP_URL || "https://sobbra.com.br";
const DESC = "Fale o gasto, fotografe o comprovante ou leia a nota fiscal. O Sobbra organiza tudo e mostra quanto ainda está livre no seu mês. Grátis para começar.";
export const metadata: Metadata = {
  metadataBase: new URL(SITE),
  title: { default: "Sobbra: saiba quanto sobra antes do mês acabar", template: "%s" },
  description: DESC,
  applicationName: "Sobbra",
  authors: [{ name: "Domma Tecnologia" }],
  creator: "Domma Tecnologia",
  other: { design: "REDBOX" },
  keywords: ["controle financeiro", "finanças pessoais", "orçamento", "app de gastos", "controle de gastos", "planejamento financeiro"],
  manifest: "/manifest.webmanifest",
  icons: {
    icon: [{ url: "/favicon.ico", sizes: "48x48" }, { url: "/icons/icon.svg", type: "image/svg+xml" }, { url: "/icons/icon-32.png", sizes: "32x32", type: "image/png" }, { url: "/icons/icon-192.png", sizes: "192x192", type: "image/png" }],
    apple: [{ url: "/apple-touch-icon.png", sizes: "180x180" }],
  },
  appleWebApp: { capable: true, title: "Sobbra", statusBarStyle: "black-translucent" },
  formatDetection: { telephone: false },
  openGraph: { type: "website", locale: "pt_BR", url: "/", siteName: "Sobbra", title: "Sobbra: saiba quanto sobra antes do mês acabar", description: DESC, images: [{ url: "/og.jpg", width: 1200, height: 630, alt: "Sobbra: saiba quanto sobra antes do mês acabar" }] },
  twitter: { card: "summary_large_image", title: "Sobbra: saiba quanto sobra antes do mês acabar", description: DESC, images: ["/og.jpg"] },
};
export const viewport: Viewport = { themeColor: [{ media: "(prefers-color-scheme: light)", color: "#F5F2E9" }, { media: "(prefers-color-scheme: dark)", color: "#0F1F1A" }], width: "device-width", initialScale: 1 };

// Aplica tema/preferencias antes da pintura para evitar flash (tema escuro obrigatorio, secao 3.4)
const boot = `try{var p=JSON.parse(localStorage.getItem('sobbra-prefs')||'{}');document.documentElement.setAttribute('data-skin',p.skin==='sutil'?'sutil':'vibe');var t=p.theme||'system';var d=t==='dark'||(t==='system'&&matchMedia('(prefers-color-scheme: dark)').matches);var c=document.documentElement.classList;if(d)c.add('dark');if(p.size)document.documentElement.style.fontSize=p.size+'%';if(p.contrast)c.add('contrast');if(p.noMotion)c.add('no-motion');}catch(e){}
if('serviceWorker' in navigator){addEventListener('load',function(){navigator.serviceWorker.register('/sw.js')})}`;

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="pt-BR" suppressHydrationWarning>
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link href="https://fonts.googleapis.com/css2?family=Arimo:wght@400;700&family=Tinos:ital,wght@0,400;1,400&display=swap" rel="stylesheet" />
        <script dangerouslySetInnerHTML={{ __html: boot }} />
      </head>
      <body className={`min-h-screen font-sans antialiased ${jakarta.variable}`}>{children}</body>
    </html>
  );
}
