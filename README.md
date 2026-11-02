# Sobbra — seu dinheiro, mais espaço para você

**Sistema desenvolvido pela Domma Tecnologia · Design pela agência REDBOX**

MVP do SaaS de gestão financeira pessoal (web responsivo + PWA), seguindo o Documento de Requisitos v1.5.

## Demonstração

`demo/sobbra-demo.html` é a demonstração completa em um único arquivo (abre no navegador, dados fictícios, sem servidor). Mostra o visual novo com os estilos Vibrante e Sutil, todos os módulos, o backoffice de planos e pagamentos e as telas públicas. Veja `demo/README.md` para reconstruir.

## Rodar localmente

Requisitos: Node 20+, PostgreSQL 14+.

```bash
cp .env.example .env        # ajuste DATABASE_URL, AUTH_SECRET e FILE_ENC_KEY
npm install
npx prisma db push          # cria as tabelas
npm run db:seed             # opcional: demo@sobbra.app / sobbra123 (cliente) e admin@sobbra.app / sobbra123 (administrador)
npm run dev                 # http://localhost:3000
npm test                    # testes do interpretador de voz, valores e faturas
```

Gere uma `FILE_ENC_KEY` com `openssl rand -hex 32` e um `AUTH_SECRET` com `openssl rand -base64 32`.

## Publicação na Vercel
- Banco: Neon (PostgreSQL) pela integração da Vercel, que cria a variável `DATABASE_URL`. O build da Vercel (`vercel-build`) roda `prisma db push` e cria as tabelas.
- Comprovantes: Vercel Blob (`BLOB_READ_WRITE_TOKEN`). Os arquivos são gravados já criptografados com AES-256-GCM.
- Funções na região `gru1` (São Paulo).

## Primeiro administrador
O primeiro acesso ao backoffice vem do `ADMIN_EMAILS` no `.env` (ou do seed). Depois disso, crie os demais administradores pela tela **Backoffice > Usuários**: o papel fica salvo no banco, e o sistema impede ficar sem nenhum administrador ativo.

## IA (seção 8.2)
Sem chave, o app funciona em **modo local**: voz interpretada por regras em pt-BR, classificação por regras/histórico/base de palavras-chave, consultor com números do banco. Comprovantes ficam guardados e o usuário preenche os campos.

Para ligar a leitura de comprovantes e respostas em linguagem natural, defina no `.env`:
- `AI_PROVIDER=groq` + `GROQ_API_KEY` (grátis, sem treino com os dados), ou
- `AI_PROVIDER=openrouter` + `OPENROUTER_API_KEY`, ou
- `AI_PROVIDER=anthropic` + `ANTHROPIC_API_KEY` (pago, para produção).

Trocar de provedor é configuração — tudo passa por `src/lib/ai.ts`.

## O que está pronto (fase MVP)
| Módulo | Onde |
|---|---|
| M1 Conta e onboarding (e-mail/senha, 3 passos, exportar/excluir conta – LGPD) | `/cadastro`, `/onboarding`, `/ajustes` |
| M2 Contas, cartões e faturas (fechamento/vencimento, pagar fatura, ajuste de saldo, saldo atual × previsto) | `/contas` |
| M3 Lançamentos (receitas, despesas, transferências, parcelas, recorrências, tags, filtros com total, edição em massa, lixeira 30 dias) | `/lancamentos` |
| M4 Captura de comprovantes (câmera, galeria, PDF, compartilhar do celular, fila assíncrona, duplicidade, criptografia AES-256) | `/comprovantes` |
| M5 Classificação em camadas (regras → histórico → base → IA) com aprendizado “aplicar a todos” | `src/lib/classify.ts` |
| M6 Painéis com drill-down, ranking vs mês anterior e média 3 meses, previsão de saldo | `/inicio`, `/relatorios` |
| M11 Consultor (“Com o que estou gastando mais?”, “O que estou fazendo de errado?”, limite no grátis) | `/consultor` |
| M14 Planos, cancelamento em 2 toques, política anti-incômodo, backoffice | `/ajustes#plano`, `/admin` |
| Agenda: compromissos, lembretes e contas a pagar, com faturas e contas agendadas entrando sozinhas; também por voz (“marcar dentista amanhã às 15h”) | `/agenda` |
| Fixas e recorrentes: “Repete todo mês” por 6 a 36 meses, por voz (“aluguel 1.400 todo mês dia 8”) e “Parar de repetir” | `/recorrentes` |
| Relatório de despesas por período e agrupamento, com download em PDF (A4) e imagem (PNG) | `/relatorios/despesas` |
| Cadastro de usuários (Clientes e Administradores): criar, editar, senha provisória com troca obrigatória, bloquear, excluir, auditoria | `/admin/usuarios`, `/admin/auditoria` |
| M15/M16 Animações, Modo Simples, termos explicados, fonte até 200%, alto contraste, tema escuro | todo o app |
| M17 Agente de voz (“Lançar gasolina 50”, vários itens, corrigir/apagar o último, perguntas) | botão 🎙️ |
| PWA (instalável, offline, atalhos, destino de compartilhamento) | `public/` |

## Fase 2 (entregue)
| Módulo | Onde |
|---|---|
| Orçamentos por categoria (cor por consumo, projeção, sugestão pela média) e metas com aporte mensal sugerido | `/orcamentos` |
| Dívidas: juros por mês, avalanche x bola de neve, simulação de pagar a mais, parcelas na agenda | `/dividas` |
| Importação de extratos OFX e CSV com mapeamento de colunas, pré-visualização e deduplicação | `/importar` |
| Contas a pagar: boleto pela câmera ou linha digitável (regras Febraban, novo fator de vencimento), copiar linha/Pix | `/contas-a-pagar` |
| NFC-e: QR Code do cupom, itens da compra e lançamento separado por categoria | `/nfce` |
| Avisos: contas vencendo, fatura fechando, saldo negativo, orçamento 80%/100%, gasto fora do padrão, resumo semanal; push | `/avisos`, `Ajustes > Avisos` |
| Consultor: simulações (cortar gasto, compra parcelada, quanto sobra em N meses) e plano de organização | `/consultor` |
| Painel inicial personalizável (mostrar/esconder e ordenar blocos) e comemorações | `/inicio` |

### Configuração da Fase 2
- **Push:** gere as chaves com `npx web-push generate-vapid-keys` e preencha `VAPID_PUBLIC_KEY` e `VAPID_PRIVATE_KEY`. No iPhone, o push só funciona com o Sobbra instalado na tela de início.
- **Avisos com o app fechado:** defina `CRON_SECRET`; o `vercel.json` agenda `/api/cron/alerts` uma vez por dia às 8h (limite do plano Hobby da Vercel; no plano Pro dá para usar `0 * * * *`, a cada hora). Com o app aberto, os avisos também são gerados a cada uso.
- **NFC-e:** sem configuração, o Sobbra consulta o portal público da SEFAZ pela URL do QR Code. Alguns estados exigem captcha; para esses, contrate um provedor de consulta e preencha `NFCE_API_URL`/`NFCE_API_KEY`.
- **Ainda não incluído na F2:** fatura de cartão em PDF (RF-061, depende da IA de visão ligada) e envio de avisos por e-mail (precisa de um provedor de e-mail).

## Próximas fases (roadmap)
- **F3**: Família, investimentos e patrimônio, gamificação, histórico de preços por produto (NFC-e), consultas por voz com resposta falada.
- **F4**: Open Finance (Pluggy/Belvo), app Android companheiro, multimoeda, IRPF.

## Cobrança do SaaS (planos)
- **Planos editáveis:** Backoffice → Planos e cobrança (nome, descrição, preço mensal/anual, limites e se está à venda).
- **Gateway:** defina `PAYMENT_PROVIDER` (`asaas` ou `stripe`) e as chaves dele. Sem isso, os clientes veem “assinatura em breve” e só o administrador muda planos (cortesias).
  - Asaas (Pix, boleto e cartão): `ASAAS_API_KEY`, `ASAAS_WEBHOOK_TOKEN`, `ASAAS_ENV=sandbox|production`. Webhook: `https://sobbra.com.br/api/billing/webhook/asaas`.
  - Stripe (cartão): `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`. Webhook: `https://sobbra.com.br/api/billing/webhook/stripe`.
- O plano é liberado quando o gateway confirma o pagamento (webhook). Cancelamento em 2 toques: o plano vale até o fim do período pago. Atraso de mais de 5 dias volta para o Grátis. Aviso 3 dias antes de cada renovação.

## Antes de produção
- Gateway de pagamento real (hoje a troca de plano é direta, para testes).
- Login com Google/Apple, 2FA e passkeys (RF-001/002).
- Row-level security no Postgres (hoje o isolamento é feito na aplicação: toda consulta filtra por `userId`).
- Armazenamento de arquivos em S3/R2 (hoje em disco local, criptografado), limite de tentativas em Redis, pentest, revisão jurídica.
