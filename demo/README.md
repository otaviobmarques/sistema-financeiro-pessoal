# Demonstração do Sobbra

`sobbra-demo.html` é a versão de demonstração do sistema em um único arquivo: abre direto no navegador, sem servidor e sem banco. Usa 12 meses de dados fictícios e guarda o que você fizer só no navegador (localStorage).

Ela usa as mesmas regras do sistema (leitura por voz, categorias, valores, boletos, dívidas, importação de extrato, NFC-e e simulações do consultor), empacotadas a partir de `src/lib`.

## O que dá para testar

- Início com saúde financeira, KPIs, fluxo de 12 meses, mapa de gastos e ritmo de gastos
- Dois estilos de cores à escolha: Vibrante e Sutil (claro e escuro)
- Movimentos, comprovantes, importar extrato, registro por voz, nota fiscal (NFC-e) e lixeira
- Plano: fixas e recorrentes, agenda, orçamentos e metas (criar, editar, excluir), dívidas e contas a pagar
- Central de relatórios com PDF, imagem e CSV
- Ajustes: perfil, aparência, avisos e minha assinatura (checkout simulado)
- Backoffice: usuários, auditoria, planos e preços, pagamentos (gateway)
- Telas públicas: página de vendas, criar conta, entrar, boas-vindas e trocar senha

## Como reconstruir

As partes ficam em `src/` (`template.html`, `logic.js`, `voice.js`, `entry*.ts`). Depois de editar:

```bash
node demo/build.mjs
```
