import { Plus_Jakarta_Sans } from "next/font/google";
// Fonte do site e das telas de acesso: baixada no build e servida pelo proprio dominio (sem bloquear a pintura).
export const jakarta = Plus_Jakarta_Sans({ subsets: ["latin"], weight: ["400", "500", "600", "700", "800"], display: "swap", variable: "--f-jak" });
